import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  TOTP,
  NobleCryptoPlugin,
  ScureBase32Plugin,
  generateSecret,
} from "otplib";
import { env } from "../../config/env";
import { redisClient } from "../../config/redis";
import { sendEmail } from "../../utils/email";
import { AppError } from "../../shared/errors/AppError";
import * as authRepo from "./auth.repository";

import type { RegisterBody } from "../../zodschemas/auth";
import type { CookieOptions } from "express";
import { LOCKOUT_DURATION_MS, LOCKOUT_THRESHOLD } from "../../utils/constants";
import {
  buildPasswordResetEmailHtml,
  buildVerificationEmailHtml,
  stripPasswordHash,
} from "../../utils/helpers";
import {
  AuthTokenResult,
  JwtAccessPayload,
  JwtRefreshPayload,
  MfaChallengeResult,
  SafeUser,
  UserRow,
} from "../../types";

export function issueTokens(user: UserRow | SafeUser) {
  const accessJti = randomUUID();
  const refreshJti = randomUUID();

  const accessToken = jwt.sign(
    {
      sub: (user as UserRow).id,
      role: user.role,
      departmentId: user.departmentId ?? null,
      jti: accessJti,
    } satisfies JwtAccessPayload,
    env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    {
      sub: (user as UserRow).id,
      jti: refreshJti,
    } satisfies JwtRefreshPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );

  return { accessToken, refreshToken, accessJti, refreshJti };
}

export function buildCookieOptions(type: "access" | "refresh"): CookieOptions {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: type === "access" ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
  };
}

export async function register(body: RegisterBody): Promise<SafeUser> {
  const existing = await authRepo.findUserByEmail(body.email);
  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const newUser = await authRepo.createUser({
    email: body.email,
    passwordHash,
    firstName: body.firstName,
    lastName: body.lastName,
    phoneNumber: body.phoneNumber,
  });

  const token = randomUUID();
  await redisClient.set(`email_verify:${token}`, newUser.id, { EX: 86400 });

  await sendEmail(
    newUser.email,
    "Verify your CivicFlow email",
    buildVerificationEmailHtml(token),
  );

  return newUser;
}

export async function verifyEmail(token: string): Promise<void> {
  const userId = await redisClient.get(`email_verify:${token}`);
  if (!userId) {
    throw new AppError(401, "Invalid or expired verification token");
  }

  await authRepo.setEmailVerified(userId);
  await redisClient.del(`email_verify:${token}`);
}

export async function login(
  email: string,
  password: string,
  ip: string,
): Promise<AuthTokenResult | MfaChallengeResult> {
  const user = await authRepo.findUserByEmail(email);
  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }
  const hashToCompare = user.passwordHash;
  const passwordValid = await bcrypt.compare(password, hashToCompare);

  if (user && user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    throw new AppError(423, "Account is temporarily locked", {
      retryAfter: user.accountLockedUntil.toISOString(),
    });
  }

  if (!user || !passwordValid) {
    if (user) {
      const newAttempts = user.failedLoginAttempts + 1;
      const lockedUntil =
        newAttempts >= LOCKOUT_THRESHOLD
          ? new Date(Date.now() + LOCKOUT_DURATION_MS)
          : null;
      await authRepo.updateLoginFailure(user.id, newAttempts, lockedUntil);
    }
    throw new AppError(401, "Invalid credentials");
  }

  if (!user.isActive) {
    throw new AppError(403, "Account is disabled");
  }

  if (!user.isEmailVerified) {
    throw new AppError(403, "Please verify your email before logging in");
  }

  await authRepo.updateLoginSuccess(user.id, ip);

  if (user.mfaEnabled) {
    const challengeToken = randomUUID();
    await redisClient.set(`mfa_challenge:${challengeToken}`, user.id, {
      EX: 300,
    });
    return { mfaRequired: true, challengeToken };
  }

  return { user: stripPasswordHash(user) };
}

export async function verifyMfa(
  challengeToken: string,
  totpCode: string,
): Promise<AuthTokenResult> {
  const userId = await redisClient.get(`mfa_challenge:${challengeToken}`);
  if (!userId) {
    throw new AppError(401, "Invalid or expired MFA challenge");
  }

  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw new AppError(401, "Invalid or expired MFA challenge");
  }

  const secret = await authRepo.findMfaSecret(userId);
  if (!secret) {
    throw new AppError(401, "MFA not configured");
  }

  const totpInstance = new TOTP({
    secret,
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
  });
  const result = await totpInstance.verify(totpCode);
  const isValid = result.valid;
  if (!isValid) {
    throw new AppError(401, "Invalid MFA code");
  }

  await redisClient.del(`mfa_challenge:${challengeToken}`);
  return { user: stripPasswordHash(user) };
}

export async function refresh(refreshTokenStr: string) {
  let payload: JwtRefreshPayload;
  try {
    payload = jwt.verify(
      refreshTokenStr,
      env.JWT_REFRESH_SECRET,
    ) as JwtRefreshPayload;
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const denied = await redisClient.get(`refresh_denylist:${payload.jti}`);
  if (denied) {
    throw new AppError(401, "Refresh token has been revoked");
  }

  const user = await authRepo.findUserById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  if (user.passwordChangedAt) {
    const tokenIssuedAt = new Date((payload.iat ?? 0) * 1000);
    if (user.passwordChangedAt > tokenIssuedAt) {
      throw new AppError(
        401,
        "Session expired due to password change, please log in again",
      );
    }
  }

  const oldTokenExp = payload.exp ?? 0;
  const remainingSeconds = oldTokenExp - Math.floor(Date.now() / 1000);
  if (remainingSeconds > 0) {
    await redisClient.set(`refresh_denylist:${payload.jti}`, "1", {
      EX: remainingSeconds,
    });
  }

  return issueTokens(user);
}

export async function logout(jti: string, tokenExp: number): Promise<void> {
  const remainingSeconds = tokenExp - Math.floor(Date.now() / 1000);
  if (remainingSeconds > 0) {
    await redisClient.set(`refresh_denylist:${jti}`, "1", {
      EX: remainingSeconds,
    });
  }
}

export async function resendVerification(
  email: string,
  ip: string,
): Promise<void> {
  const emailKey = `resend_email:${email}`;
  const ipKey = `resend_ip:${ip}`;

  const [emailCount, ipCount] = await Promise.all([
    redisClient.get(emailKey),
    redisClient.get(ipKey),
  ]);

  if (Number(emailCount) >= 3) {
    throw new AppError(429, "Too many requests. Please try again later.");
  }
  if (Number(ipCount) >= 10) {
    throw new AppError(429, "Too many requests. Please try again later.");
  }

  const user = await authRepo.findUserByEmail(email);

  if (user && !user.isEmailVerified) {
    const token = randomUUID();
    await redisClient.set(`email_verify:${token}`, user.id, { EX: 86400 });
    await sendEmail(
      user.email,
      "Verify your CivicFlow email",
      buildVerificationEmailHtml(token),
    );
  }

  await Promise.all([
    redisClient.multi().incr(emailKey).expire(emailKey, 3600).exec(),
    redisClient.multi().incr(ipKey).expire(ipKey, 3600).exec(),
  ]);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await authRepo.findUserByEmail(email);

  if (user && user.isEmailVerified) {
    const token = randomUUID();
    await redisClient.set(`pwd_reset:${token}`, user.id, { EX: 3600 });
    await sendEmail(
      user.email,
      "Reset your CivicFlow password",
      buildPasswordResetEmailHtml(token),
    );
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const userId = await redisClient.get(`pwd_reset:${token}`);
  if (!userId) {
    throw new AppError(401, "Invalid or expired password reset token");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await authRepo.updatePassword(userId, passwordHash);
  await redisClient.del(`pwd_reset:${token}`);
}

export async function setupMfa(
  userId: string,
): Promise<{ uri: string; secret: string }> {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const secret = generateSecret();

  // Store the pending secret in Redis for 10 minutes — only written to DB
  // after the user confirms with a valid TOTP code.
  await redisClient.set(`mfa_setup:${userId}`, secret, { EX: 600 });

  const uri = [
    `otpauth://totp/`,
    `${encodeURIComponent(`CivicFlow:${user.email}`)}`,
    `?secret=${secret}`,
    `&issuer=${encodeURIComponent("CivicFlow")}`,
    `&algorithm=SHA1`,
    `&digits=6`,
    `&period=30`,
  ].join("");

  return { uri, secret };
}

export async function confirmMfa(
  userId: string,
  totpCode: string,
): Promise<void> {
  const secret = await redisClient.get(`mfa_setup:${userId}`);
  if (!secret) {
    throw new AppError(
      400,
      "No MFA setup in progress. Please call /auth/mfa/setup first.",
    );
  }

  const totpInstance = new TOTP({
    secret,
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
  });
  const result = await totpInstance.verify(totpCode);
  if (!result.valid) {
    throw new AppError(401, "Invalid MFA code");
  }

  await authRepo.upsertMfaSecret(userId, secret);
  await authRepo.enableMfa(userId);
  await redisClient.del(`mfa_setup:${userId}`);
}

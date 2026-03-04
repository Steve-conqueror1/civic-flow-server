import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
  RegisterBodySchema,
  LoginBodySchema,
  MfaVerifyBodySchema,
  MfaConfirmBodySchema,
  ResendVerificationBodySchema,
  RequestPasswordResetBodySchema,
  ResetPasswordBodySchema,
} from "../../zodschemas/auth";

import * as authService from "./auth.service";
import { JwtRefreshPayload, UserRow } from "../../types";

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = RegisterBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const user = await authService.register(parsed.data);
    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/auth/verify-email?token=<uuid>
 * @desc    Verify a user's email address using the token sent in the verification email
 * @access  Public
 */
export const verifyEmailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(400).json({
        success: false,
        message: "Verification token is required.",
      });
      return;
    }

    await authService.verifyEmail(token);
    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login with email and password. If MFA is enabled, returns a challenge token for the next step.
 * @access  Public
 */
export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = LoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const result = await authService.login(
      parsed.data.email,
      parsed.data.password,
      ip,
    );

    if ("mfaRequired" in result) {
      res.status(202).json({
        success: true,
        message: "MFA verification required.",
        data: {
          mfaRequired: true,
          challengeToken: result.challengeToken,
        },
      });
      return;
    }

    const { accessToken, refreshToken } = authService.issueTokens(
      result.user as UserRow,
    );
    res
      .cookie(
        "access_token",
        accessToken,
        authService.buildCookieOptions("access"),
      )
      .cookie(
        "refresh_token",
        refreshToken,
        authService.buildCookieOptions("refresh"),
      )
      .status(200)
      .json({
        success: true,
        message: "Login successful.",
        data: { user: result.user },
      });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/mfa/verify
 * @desc    Verify a user's MFA code using the challenge token returned from login
 * @access  Public
 */
export const verifyMfaHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = MfaVerifyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await authService.verifyMfa(
      parsed.data.challengeToken,
      parsed.data.totpCode,
    );

    const { accessToken, refreshToken } = authService.issueTokens(
      result.user as UserRow,
    );
    res
      .cookie(
        "access_token",
        accessToken,
        authService.buildCookieOptions("access"),
      )
      .cookie(
        "refresh_token",
        refreshToken,
        authService.buildCookieOptions("refresh"),
      )
      .status(200)
      .json({
        success: true,
        message: "MFA verified successfully.",
        data: { user: result.user },
      });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh a user's access token using a valid refresh token
 */

export const refreshHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies["refresh_token"] as string | undefined;
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token is required.",
      });
      return;
    }

    const tokens = await authService.refresh(refreshToken);
    res
      .cookie(
        "access_token",
        tokens.accessToken,
        authService.buildCookieOptions("access"),
      )
      .cookie(
        "refresh_token",
        tokens.refreshToken,
        authService.buildCookieOptions("refresh"),
      )
      .status(200)
      .json({
        success: true,
        message: "Token refreshed.",
      });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout a user by revoking their refresh token and clearing cookies
 */

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies["refresh_token"] as string | undefined;

    if (refreshToken) {
      const decoded = jwt.decode(refreshToken) as JwtRefreshPayload | null;
      if (decoded?.jti && decoded?.exp) {
        await authService.logout(decoded.jti, decoded.exp);
      }
    }

    res
      .clearCookie("access_token", authService.buildCookieOptions("access"))
      .clearCookie("refresh_token", authService.buildCookieOptions("refresh"))
      .status(200)
      .json({
        success: true,
        message: "Logged out successfully.",
      });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email to a user
 * @access  Public
 */
export const resendVerificationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = ResendVerificationBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    await authService.resendVerification(parsed.data.email, ip);

    res.status(200).json({
      success: true,
      message:
        "If your email is registered and unverified, a new verification link has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/request-password-reset
 * @desc    Request a password reset for a user
 * @access  Public
 */

export const requestPasswordResetHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = RequestPasswordResetBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    await authService.requestPasswordReset(parsed.data.email);

    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/mfa/setup
 * @desc    Initiate MFA setup — generates a TOTP secret and returns an otpauth:// URI
 * @access  Authenticated
 */
export const setupMfaHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { uri, secret } = await authService.setupMfa(req.user!.sub);
    res.status(200).json({
      success: true,
      message:
        "Scan the QR code with your authenticator app, then confirm with POST /auth/mfa/confirm.",
      data: { uri, secret },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/mfa/confirm
 * @desc    Confirm MFA setup by verifying a TOTP code — enables MFA on the account
 * @access  Authenticated
 */
export const confirmMfaHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = MfaConfirmBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    await authService.confirmMfa(req.user!.sub, parsed.data.totpCode);
    res.status(200).json({
      success: true,
      message: "MFA has been enabled on your account.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/me
 * @desc   Get the currently authenticated user's information
 * @access  Public (but requires valid access token)
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await authService.getCurrentUser(req.user!.sub);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset a user's password using the token sent in the password reset email.
 * @access  Public
 */

export const resetPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = ResetPasswordBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    await authService.resetPassword(parsed.data.token, parsed.data.password);

    res
      .clearCookie("access_token", authService.buildCookieOptions("access"))
      .clearCookie("refresh_token", authService.buildCookieOptions("refresh"))
      .status(200)
      .json({
        success: true,
        message: "Password reset successfully. Please log in again.",
      });
  } catch (err) {
    next(err);
  }
};

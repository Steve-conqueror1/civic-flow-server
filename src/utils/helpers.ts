import { env } from "../config";
import { SafeUser, UserRow } from "../types";

export function stripPasswordHash(user: UserRow): SafeUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export function buildVerificationEmailHtml(token: string): string {
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return `
    <h2>Verify your CivicFlow email</h2>
    <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
    <a href="${url}">${url}</a>
  `;
}

export function buildPasswordResetEmailHtml(token: string): string {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return `
    <h2>Reset your CivicFlow password</h2>
    <p>Click the link below to reset your password. This link expires in 1 hour.</p>
    <a href="${url}">${url}</a>
  `;
}

export function buildSuspensionEmailHtml(firstName: string): string {
  return `
    <h2>Your CivicFlow account has been suspended</h2>
    <p>Hi ${firstName},</p>
    <p>Your account has been suspended by an administrator. You will not be able to access the platform until your account is reactivated.</p>
    <p>If you believe this is a mistake, please contact support.</p>
  `;
}

export function buildDeactivationEmailHtml(firstName: string): string {
  return `
    <h2>Your CivicFlow account has been deactivated</h2>
    <p>Hi ${firstName},</p>
    <p>Your account has been deactivated by an administrator. You will not be able to access the platform until your account is reactivated.</p>
    <p>If you believe this is a mistake, please contact support.</p>
  `;
}

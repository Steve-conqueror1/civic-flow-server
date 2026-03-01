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

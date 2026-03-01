import { z } from "zod";

export const RegisterBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneNumber: z.string().optional(),
});

export const LoginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const MfaVerifyBodySchema = z.object({
  challengeToken: z.uuid(),
  totpCode: z.string().length(6),
});

export const ResendVerificationBodySchema = z.object({
  email: z.email(),
});

export const RequestPasswordResetBodySchema = z.object({
  email: z.email(),
});

export const ResetPasswordBodySchema = z.object({
  token: z.uuid(),
  password: z.string().min(8).max(128),
});

export const MfaConfirmBodySchema = z.object({
  totpCode: z.string().length(6),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type RegisterBody = z.infer<typeof RegisterBodySchema>;
export type LoginBody = z.infer<typeof LoginBodySchema>;
export type MfaVerifyBody = z.infer<typeof MfaVerifyBodySchema>;
export type MfaConfirmBody = z.infer<typeof MfaConfirmBodySchema>;
export type ResendVerificationBody = z.infer<
  typeof ResendVerificationBodySchema
>;
export type RequestPasswordResetBody = z.infer<
  typeof RequestPasswordResetBodySchema
>;
export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>;

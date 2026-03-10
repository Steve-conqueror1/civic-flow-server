import { z } from "zod";

export const SubmitContactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  subject: z.string().min(1).max(255),
  message: z.string().min(1).max(5000),
  turnstileToken: z.string().min(1),
});

export const ContactParamsSchema = z.object({
  id: z.string().uuid("Invalid contact message ID format."),
});

export const UpdateContactStatusSchema = z.object({
  status: z.enum(["new", "read", "replied", "archived"]),
});

export type SubmitContactBody = z.infer<typeof SubmitContactSchema>;
export type ContactParams = z.infer<typeof ContactParamsSchema>;
export type UpdateContactStatusBody = z.infer<typeof UpdateContactStatusSchema>;

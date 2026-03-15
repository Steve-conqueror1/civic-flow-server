import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string(),
  icon: z.string().max(255).optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  icon: z.string().max(255).optional(),
});

export const UpdateCategoryStatusSchema = z.object({
  isActive: z.boolean(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateCategoryBody = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof UpdateCategorySchema>;
export type UpdateCategoryStatusBody = z.infer<
  typeof UpdateCategoryStatusSchema
>;

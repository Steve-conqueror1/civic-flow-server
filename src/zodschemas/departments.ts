import { z } from "zod";

// ---------------------------------------------------------------------------
// Route parameter schemas
// ---------------------------------------------------------------------------

export const DepartmentParamsSchema = z.object({
  id: z.string().uuid("Invalid department ID format."),
});

// ---------------------------------------------------------------------------
// Request body schemas
// ---------------------------------------------------------------------------

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  icon: z.string().max(255).optional(),
});

export const UpdateDepartmentSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    icon: z.string().max(255).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided.",
  });

export const UpdateDepartmentStatusSchema = z.object({
  isActive: z.boolean(),
});

// ---------------------------------------------------------------------------
// Query parameter schemas
// ---------------------------------------------------------------------------

export const ListDepartmentsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateDepartmentBody = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartmentBody = z.infer<typeof UpdateDepartmentSchema>;
export type UpdateDepartmentStatusBody = z.infer<typeof UpdateDepartmentStatusSchema>;
export type ListDepartmentsQuery = z.infer<typeof ListDepartmentsQuerySchema>;

import { z } from "zod";

// ---------------------------------------------------------------------------
// Request body schemas
// ---------------------------------------------------------------------------

const BaseServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  instructions: z.string().optional(),
  categoryId: z.string().uuid(),
  departmentId: z.string().uuid(),
  minResponseDays: z.number().int().min(1).optional(),
  maxResponseDays: z.number().int().min(1).optional(),
});

export const CreateServiceSchema = BaseServiceSchema.refine(
  (data) =>
    !data.minResponseDays ||
    !data.maxResponseDays ||
    data.maxResponseDays >= data.minResponseDays,
  {
    message: "maxResponseDays must be >= minResponseDays",
    path: ["maxResponseDays"],
  },
);

export const UpdateServiceSchema = BaseServiceSchema.partial().refine(
  (data) =>
    !data.minResponseDays ||
    !data.maxResponseDays ||
    data.maxResponseDays >= data.minResponseDays,
  {
    message: "maxResponseDays must be >= minResponseDays",
    path: ["maxResponseDays"],
  },
);

// ---------------------------------------------------------------------------
// Query parameter schemas
// ---------------------------------------------------------------------------

export const ServiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  includeInactive: z.coerce.boolean().optional(),
});

export const ServiceSearchQuerySchema = z.object({
  q: z.string().min(1, "Search term cannot be blank"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const GroupedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const PopularServicesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).default(4),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateServiceBody = z.infer<typeof BaseServiceSchema>;
export type UpdateServiceBody = Partial<CreateServiceBody>;
export type ServiceQuery = z.infer<typeof ServiceQuerySchema>;
export type ServiceSearchQuery = z.infer<typeof ServiceSearchQuerySchema>;
export type GroupedQuery = z.infer<typeof GroupedQuerySchema>;
export type PopularServicesQuery = z.infer<typeof PopularServicesQuerySchema>;

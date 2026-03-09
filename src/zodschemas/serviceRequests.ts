import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const REQUEST_STATUSES = [
  "open",
  "in_progress",
  "under_review",
  "pending_review",
  "resolved",
  "rejected",
  "closed",
] as const;

// ---------------------------------------------------------------------------
// Request body schemas
// ---------------------------------------------------------------------------

const LocationSchema = z.object({
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const CreateRequestSchema = z.object({
  serviceId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  location: LocationSchema.optional(),
  attachments: z.array(z.string().min(1)).max(4).optional(),
});

export const UpdateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  note: z.string().optional(),
});

export const CancelRequestSchema = z.object({
  note: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Query parameter schemas
// ---------------------------------------------------------------------------

export const CitizenRequestQuerySchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const AdminRequestQuerySchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  serviceId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateRequestBody = z.infer<typeof CreateRequestSchema>;
export type UpdateRequestStatusBody = z.infer<typeof UpdateRequestStatusSchema>;
export type CancelRequestBody = z.infer<typeof CancelRequestSchema>;
export type CitizenRequestQuery = z.infer<typeof CitizenRequestQuerySchema>;
export type AdminRequestQuery = z.infer<typeof AdminRequestQuerySchema>;

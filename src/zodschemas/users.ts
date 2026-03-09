import { z } from "zod";

// ---------------------------------------------------------------------------
// Self-service update (citizen editing own profile)
// ---------------------------------------------------------------------------

export const UpdateMeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).optional().nullable(),
  address: z.string().optional().nullable(),
  mfaEnabled: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Admin update (admin / super_admin editing another user)
// ---------------------------------------------------------------------------

export const AdminUpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().max(255).optional(),
  role: z.enum(["citizen", "admin", "super_admin"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

// ---------------------------------------------------------------------------
// List users query params
// ---------------------------------------------------------------------------

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  role: z.enum(["citizen", "admin", "super_admin"]).optional(),
  status: z.enum(["active", "inactive", "suspended", "deleted"]).optional(),
  search: z.string().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type UpdateMeBody = z.infer<typeof UpdateMeSchema>;
export type AdminUpdateUserBody = z.infer<typeof AdminUpdateUserSchema>;
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

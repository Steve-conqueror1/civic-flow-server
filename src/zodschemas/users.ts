import { z } from "zod";
import { USER_ROLES, USER_STATUS } from "../utils/constants";

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
  role: z
    .enum([USER_ROLES.CITIZEN, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN])
    .optional(),
  status: z
    .enum([USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.SUSPENDED])
    .optional(),
});

// ---------------------------------------------------------------------------
// List users query params
// ---------------------------------------------------------------------------

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  role: z
    .enum([USER_ROLES.CITIZEN, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN])
    .optional(),
  status: z
    .enum([
      USER_STATUS.ACTIVE,
      USER_STATUS.INACTIVE,
      USER_STATUS.SUSPENDED,
      USER_STATUS.DELETED,
    ])
    .optional(),
  search: z.string().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type UpdateMeBody = z.infer<typeof UpdateMeSchema>;
export type AdminUpdateUserBody = z.infer<typeof AdminUpdateUserSchema>;
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

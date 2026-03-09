import { randomUUID } from "crypto";
import { AppError } from "../../shared/errors/AppError";
import { redisClient } from "../../config/redis";
import { sendEmail } from "../../utils/email";
import {
  buildVerificationEmailHtml,
  stripPasswordHash,
} from "../../utils/helpers";
import * as usersRepo from "./users.repository";
import type { SafeUser, UserRow } from "../../types";
import type { UpdateMeBody, AdminUpdateUserBody } from "../../zodschemas/users";
import { USER_ROLES, USER_STATUS } from "../../utils/constants";

type Pagination = { page: number; limit: number; total: number };

// ---------------------------------------------------------------------------
// Role hierarchy helpers
// ---------------------------------------------------------------------------

function canModifyTarget(
  requesterRole: UserRow["role"],
  targetRole: UserRow["role"],
): boolean {
  if (requesterRole === USER_ROLES.ADMIN) {
    return targetRole === USER_ROLES.CITIZEN;
  }
  if (requesterRole === USER_ROLES.SUPER_ADMIN) {
    return targetRole === USER_ROLES.CITIZEN || targetRole === USER_ROLES.ADMIN;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Self-service
// ---------------------------------------------------------------------------

export async function getMe(userId: string): Promise<SafeUser> {
  const user = await usersRepo.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return stripPasswordHash(user);
}

export async function updateMe(
  userId: string,
  data: UpdateMeBody,
): Promise<SafeUser> {
  const user = await usersRepo.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const updated = await usersRepo.updateById(userId, data);
  return updated!;
}

export async function deleteMe(userId: string): Promise<void> {
  const user = await usersRepo.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.role === USER_ROLES.SUPER_ADMIN) {
    const activeSuperAdmins = await usersRepo.countByRoleAndStatus(
      USER_ROLES.SUPER_ADMIN,
      USER_STATUS.ACTIVE,
    );
    if (activeSuperAdmins <= 1) {
      throw new AppError(
        403,
        "Cannot delete the last active super admin account",
      );
    }
  }

  await usersRepo.softDeleteById(userId);
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function listUsers(opts: {
  page: number;
  limit: number;
  role?: string;
  status?: string;
  search?: string;
}): Promise<{ users: SafeUser[]; pagination: Pagination }> {
  const { rows, total } = await usersRepo.findAll(opts);

  const safeUsers = rows.map(stripPasswordHash);

  return {
    users: safeUsers,
    pagination: { page: opts.page, limit: opts.limit, total },
  };
}

export async function getUserById(targetId: string): Promise<SafeUser> {
  const user = await usersRepo.findById(targetId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return stripPasswordHash(user);
}

// ---------------------------------------------------------------------------
// Admin mutations
// ---------------------------------------------------------------------------

export async function adminUpdateUser(
  requesterId: string,
  requesterRole: UserRow["role"],
  targetId: string,
  data: AdminUpdateUserBody,
): Promise<SafeUser> {
  const target = await usersRepo.findById(targetId);
  if (!target) {
    throw new AppError(404, "User not found");
  }

  if (!canModifyTarget(requesterRole, target.role)) {
    throw new AppError(403, "You do not have permission to modify this user");
  }

  const { email: newEmail, ...restData } = data;
  const updateData: Record<string, unknown> = { ...restData };
  updateData.updatedBy = requesterId;

  // If email is changing, store pending email in Redis and send verification.
  // The email is only applied to the DB once the user clicks the verification link.
  if (newEmail && newEmail !== target.email) {
    const token = randomUUID();
    await redisClient.set(
      `email_change:${token}`,
      JSON.stringify({ userId: target.id, newEmail }),
      { EX: 86400 },
    );
    await sendEmail(
      newEmail,
      "Verify your CivicFlow email",
      buildVerificationEmailHtml(token),
    );
  }

  const updated = await usersRepo.updateById(targetId, updateData);
  return updated!;
}

export async function deactivateUser(
  requesterId: string,
  requesterRole: UserRow["role"],
  targetId: string,
): Promise<SafeUser> {
  const target = await usersRepo.findById(targetId);
  if (!target) {
    throw new AppError(404, "User not found");
  }

  if (!canModifyTarget(requesterRole, target.role)) {
    throw new AppError(403, "You do not have permission to modify this user");
  }

  if (target.status === USER_STATUS.DELETED) {
    throw new AppError(409, "Cannot change status of a deleted account");
  }

  // Toggle: inactive → active, anything else → inactive
  const newStatus =
    target.status === USER_STATUS.INACTIVE
      ? USER_STATUS.ACTIVE
      : USER_STATUS.INACTIVE;

  const updated = await usersRepo.updateById(targetId, {
    status: newStatus,
    updatedBy: requesterId,
  });
  return updated!;
}

export async function adminDeleteUser(
  requesterId: string,
  requesterRole: UserRow["role"],
  targetId: string,
): Promise<void> {
  const target = await usersRepo.findById(targetId);
  if (!target) {
    throw new AppError(404, "User not found");
  }

  if (!canModifyTarget(requesterRole, target.role)) {
    throw new AppError(403, "You do not have permission to delete this user");
  }

  if (target.role === USER_ROLES.SUPER_ADMIN) {
    const activeSuperAdmins = await usersRepo.countByRoleAndStatus(
      USER_ROLES.SUPER_ADMIN,
      USER_STATUS.ACTIVE,
    );
    if (activeSuperAdmins <= 1) {
      throw new AppError(
        403,
        "Cannot delete the last active super admin account",
      );
    }
  }

  await usersRepo.softDeleteById(targetId);
}

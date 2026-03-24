import { randomUUID } from "crypto";
import { AppError } from "../../shared/errors/AppError";
import { redisClient } from "../../config/redis";
import { sendEmail } from "../../utils/email";
import {
  buildVerificationEmailHtml,
  buildSuspensionEmailHtml,
  buildDeactivationEmailHtml,
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
// Admin stats
// ---------------------------------------------------------------------------

export async function getUserStats() {
  const staffRoles: UserRow["role"][] = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN];
  return usersRepo.getUserStats(staffRoles);
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

// ---------------------------------------------------------------------------
// Unified status management
// ---------------------------------------------------------------------------

export async function setUserStatus(
  requesterId: string,
  requesterRole: UserRow["role"],
  targetId: string,
  newStatus: NonNullable<UserRow["status"]>,
  opts?: { reason?: string; ipAddress?: string; userAgent?: string },
): Promise<SafeUser> {
  const target = await usersRepo.findById(targetId);
  if (!target) {
    throw new AppError(404, "User not found");
  }

  if (requesterId === targetId) {
    throw new AppError(403, "You cannot change your own status");
  }

  if (!canModifyTarget(requesterRole, target.role)) {
    throw new AppError(403, "You do not have permission to modify this user");
  }

  if (target.status === newStatus) {
    throw new AppError(409, `User is already ${newStatus}`);
  }

  if (target.status === USER_STATUS.DELETED) {
    throw new AppError(403, "Cannot change status of a deleted account");
  }

  // Last super-admin guard for non-active statuses
  if (
    newStatus !== USER_STATUS.ACTIVE &&
    target.role === USER_ROLES.SUPER_ADMIN
  ) {
    const activeSuperAdmins = await usersRepo.countByRoleAndStatus(
      USER_ROLES.SUPER_ADMIN,
      USER_STATUS.ACTIVE,
    );
    if (activeSuperAdmins <= 1) {
      throw new AppError(
        403,
        "Cannot change status of the last active super admin account",
      );
    }
  }

  const updated = await usersRepo.updateById(targetId, {
    status: newStatus,
    updatedBy: requesterId,
  });

  // Write audit record
  await usersRepo.insertStatusAuditRecord({
    userId: targetId,
    changedBy: requesterId,
    oldStatus: target.status!,
    newStatus,
    reason: opts?.reason,
    ipAddress: opts?.ipAddress,
    userAgent: opts?.userAgent,
  });

  // Revoke all active sessions on suspension
  if (newStatus === USER_STATUS.SUSPENDED) {
    await redisClient.set(
      `user_sessions_revoked:${targetId}`,
      String(Math.floor(Date.now() / 1000)),
    );
  }

  // Email notifications
  if (newStatus === USER_STATUS.SUSPENDED) {
    await sendEmail(
      target.email,
      "Your CivicFlow account has been suspended",
      buildSuspensionEmailHtml(target.firstName),
    );
  } else if (newStatus === USER_STATUS.INACTIVE) {
    await sendEmail(
      target.email,
      "Your CivicFlow account has been deactivated",
      buildDeactivationEmailHtml(target.firstName),
    );
  }

  return updated!;
}

export async function deactivateUser(
  requesterId: string,
  requesterRole: UserRow["role"],
  targetId: string,
  opts?: { reason?: string; ipAddress?: string; userAgent?: string },
): Promise<SafeUser> {
  return setUserStatus(requesterId, requesterRole, targetId, USER_STATUS.INACTIVE, opts);
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function getActiveCitizenCount(): Promise<number> {
  const CACHE_KEY = "users:citizen_active_count";

  const cached = await redisClient.get(CACHE_KEY);
  if (cached !== null) {
    return parseInt(cached, 10);
  }

  const count = await usersRepo.countByRoleAndStatus(
    USER_ROLES.CITIZEN,
    USER_STATUS.ACTIVE,
  );

  await redisClient.set(CACHE_KEY, String(count), { EX: 60 });

  return count;
}

export async function adminDeleteUser(
  requesterId: string,
  requesterRole: UserRow["role"],
  targetId: string,
  opts?: { reason?: string; ipAddress?: string; userAgent?: string },
): Promise<SafeUser> {
  return setUserStatus(requesterId, requesterRole, targetId, USER_STATUS.DELETED, opts);
}

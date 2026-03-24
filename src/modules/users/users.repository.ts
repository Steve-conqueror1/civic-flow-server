import { eq, and, or, ilike, count, sql } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "../../config";
import { users } from "./users.schema";
import type { SafeUser, UserRow } from "../../types";
import { USER_STATUS } from "../../utils/constants";

export type UserStats = {
  totalUsers: number;
  totalStaff: number;
  inactiveUsers: number;
  suspendedUsers: number;
};

type UserUpdate = Partial<InferInsertModel<typeof users>>;

// ---------------------------------------------------------------------------
// Finders
// ---------------------------------------------------------------------------

export async function findById(id: string): Promise<UserRow | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function findAll(opts: {
  page: number;
  limit: number;
  role?: string;
  status?: string;
  search?: string;
}): Promise<{ rows: UserRow[]; total: number }> {
  const { page, limit, role, status, search } = opts;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (role) {
    conditions.push(eq(users.role, role as UserRow["role"]));
  }
  if (status) {
    conditions.push(
      eq(
        users.status,
        status as "active" | "inactive" | "suspended" | "deleted",
      ),
    );
  }
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
        ilike(users.email, pattern),
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt),
    db.select({ total: count() }).from(users).where(whereClause),
  ]);

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function updateById(
  id: string,
  data: UserUpdate,
): Promise<SafeUser | undefined> {
  const result = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  if (!result[0]) return undefined;
  const { passwordHash: _, ...safe } = result[0];
  return safe as SafeUser;
}

export async function softDeleteById(id: string): Promise<void> {
  await db
    .update(users)
    .set({ status: USER_STATUS.DELETED })
    .where(eq(users.id, id));
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export async function getUserStats(
  staffRoles: UserRow["role"][],
): Promise<UserStats> {
  const roleList = staffRoles.map((r) => `'${r}'`).join(", ");

  const result = await db
    .select({
      totalUsers: count(),
      totalStaff:
        sql<number>`(count(*) filter (where ${users.role} in (${sql.raw(roleList)})))::int`,
      inactiveUsers:
        sql<number>`(count(*) filter (where ${users.isEmailVerified} = false))::int`,
      suspendedUsers:
        sql<number>`(count(*) filter (where ${users.status} = 'suspended'))::int`,
    })
    .from(users);

  const row = result[0];
  return {
    totalUsers: Number(row.totalUsers),
    totalStaff: row.totalStaff,
    inactiveUsers: row.inactiveUsers,
    suspendedUsers: row.suspendedUsers,
  };
}

export async function countByRoleAndStatus(
  role: UserRow["role"],
  status: NonNullable<UserRow["status"]>,
): Promise<number> {
  const result = await db
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.role, role), eq(users.status, status)));
  return Number(result[0].total);
}

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../../config";
import { users } from "../users/users.schema";
import { userMfa } from "./auth.schema";
import type { UserRow, SafeUser, CreateUserData } from "../../types";

const db = drizzle(pool);

export async function findUserByEmail(
  email: string,
): Promise<UserRow | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] as UserRow | undefined;
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] as UserRow | undefined;
}

export async function createUser(data: CreateUserData): Promise<SafeUser> {
  const result = await db
    .insert(users)
    .values({
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      address: data.address,
    })
    .returning();
  const { passwordHash: _, ...safeUser } = result[0];
  return safeUser as SafeUser;
}

export async function setEmailVerified(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ isEmailVerified: true })
    .where(eq(users.id, userId));
}

export async function updateLoginFailure(
  userId: string,
  attempts: number,
  lockedUntil: Date | null,
): Promise<void> {
  await db
    .update(users)
    .set({
      failedLoginAttempts: attempts,
      accountLockedUntil: lockedUntil,
    })
    .where(eq(users.id, userId));
}

export async function updateLoginSuccess(
  userId: string,
  ip: string,
): Promise<void> {
  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    })
    .where(eq(users.id, userId));
}

export async function findMfaSecret(userId: string): Promise<string | null> {
  const result = await db
    .select({ totpSecret: userMfa.totpSecret })
    .from(userMfa)
    .where(eq(userMfa.userId, userId))
    .limit(1);
  return result[0]?.totpSecret ?? null;
}

export async function updatePassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db
    .update(users)
    .set({
      passwordHash,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      accountLockedUntil: null,
    })
    .where(eq(users.id, userId));
}

export async function upsertMfaSecret(
  userId: string,
  totpSecret: string,
): Promise<void> {
  await db.insert(userMfa).values({ userId, totpSecret }).onConflictDoUpdate({
    target: userMfa.userId,
    set: { totpSecret },
  });
}

export async function enableMfa(userId: string): Promise<void> {
  await db.update(users).set({ mfaEnabled: true }).where(eq(users.id, userId));
}

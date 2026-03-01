import type { InferSelectModel } from "drizzle-orm";
import type { users } from "../modules/users/users.schema";

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export type UserRow = InferSelectModel<typeof users>;

export type SafeUser = Omit<UserRow, "passwordHash">;

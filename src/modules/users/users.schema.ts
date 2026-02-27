import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "citizen",
  "government_employee",
  "department_head",
  "ministry_official",
  "admin",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),

    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 20 }),

    role: userRoleEnum("role").notNull().default("citizen"),

    isActive: boolean("is_active").notNull().default(true),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),

    departmentId: uuid("department_id"),
    ministry: varchar("ministry", { length: 255 }),
    jobTitle: varchar("job_title", { length: 255 }),
    employeeId: varchar("employee_id", { length: 100 }),

    preferredLanguage: varchar("preferred_language", { length: 5 })
      .notNull()
      .default("en"),

    timezone: varchar("timezone", { length: 100 })
      .notNull()
      .default("America/Edmonton"),

    notificationPreferences: jsonb("notification_preferences")
      .$type<{
        email: boolean;
        sms: boolean;
        inApp: boolean;
      }>()
      .notNull()
      .default({
        email: true,
        sms: false,
        inApp: true,
      }),

    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),

    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastLoginIp: varchar("last_login_ip", { length: 100 }),

    passwordChangedAt: timestamp("password_changed_at", {
      withTimezone: true,
    }),

    accountLockedUntil: timestamp("account_locked_until", {
      withTimezone: true,
    }),

    aiUsageStats: jsonb("ai_usage_stats")
      .$type<{
        totalRequestsAnalyzed: number;
        lastAiInteraction?: string;
      }>()
      .default({
        totalRequestsAnalyzed: 0,
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
    departmentIdx: index("users_department_idx").on(table.departmentId),
  }),
);

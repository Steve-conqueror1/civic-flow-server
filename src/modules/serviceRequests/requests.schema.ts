import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  integer,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

import { users } from "../users/users.schema";
import { services } from "../services/service.schema";

export const requestStatusEnum = pgEnum("request_status", [
  "open",
  "in_progress",
  "under_review",
  "pending_review",
  "resolved",
  "rejected",
  "closed",
]);

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),

    title: varchar("title", { length: 255 }).notNull(),

    description: text("description").notNull(),

    note: text("note"),

    status: requestStatusEnum("status").notNull().default("open"),

    location: jsonb("location").$type<{
      address?: string;
      lat?: number;
      lng?: number;
    }>(),

    attachments: jsonb("attachments").$type<string[]>(),

    assignedTo: uuid("assigned_to").references(() => users.id),

    priority: integer("priority").default(0),

    aiSummary: text("ai_summary"),

    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
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
  },
  (table) => ({
    userIdx: index("requests_user_idx").on(table.userId),
    serviceIdx: index("requests_service_idx").on(table.serviceId),
    statusIdx: index("requests_status_idx").on(table.status),
    assignedIdx: index("requests_assigned_idx").on(table.assignedTo),
  }),
);

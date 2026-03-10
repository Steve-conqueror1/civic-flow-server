import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const contactMessageStatusEnum = pgEnum("contact_message_status", [
  "new",
  "read",
  "replied",
  "archived",
]);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  ipAddress: text("ip_address"),
  status: text("status").default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "../users/users.schema";

export const userMfa = pgTable("user_mfa", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  totpSecret: text("totp_secret").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

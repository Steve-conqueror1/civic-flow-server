import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { categories } from "../serviceCategories";
import { departments } from "../departments";

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    instructions: text("instructions"),
    isActive: boolean("is_active").notNull().default(true),
    minResponseDays: integer("min_response_days").default(2),
    maxResponseDays: integer("max_response_days").default(3),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    categoryIdx: index("services_category_idx").on(table.categoryId),
    departmentIdx: index("services_department_idx").on(table.departmentId),
  }),
);

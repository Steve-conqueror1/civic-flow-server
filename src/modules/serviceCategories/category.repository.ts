import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../../config";
import { categories } from "./category.schema";
import type { InferSelectModel } from "drizzle-orm";

const db = drizzle(pool);

export type CategoryRow = InferSelectModel<typeof categories>;

export async function findAllActive(): Promise<CategoryRow[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true));
}

export async function findById(
  id: string,
): Promise<CategoryRow | undefined> {
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return result[0];
}

export async function findByName(
  name: string,
): Promise<CategoryRow | undefined> {
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.name, name))
    .limit(1);
  return result[0];
}

export async function create(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}): Promise<CategoryRow> {
  const result = await db.insert(categories).values(data).returning();
  return result[0];
}

export async function update(
  id: string,
  data: Partial<{ name: string; slug: string; description: string; icon: string }>,
): Promise<CategoryRow | undefined> {
  const result = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();
  return result[0];
}

export async function setStatus(
  id: string,
  isActive: boolean,
): Promise<CategoryRow | undefined> {
  const result = await db
    .update(categories)
    .set({ isActive })
    .where(eq(categories.id, id))
    .returning();
  return result[0];
}

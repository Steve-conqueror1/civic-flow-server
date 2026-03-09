import { eq } from "drizzle-orm";
import { db } from "../../config";
import { departments } from "./department.schema";
import type { InferSelectModel } from "drizzle-orm";

export type DepartmentRow = InferSelectModel<typeof departments>;

// ---------------------------------------------------------------------------
// Finders
// ---------------------------------------------------------------------------

export async function findAll(opts: {
  includeInactive?: boolean;
}): Promise<DepartmentRow[]> {
  const whereClause = opts.includeInactive
    ? undefined
    : eq(departments.isActive, true);

  return db
    .select()
    .from(departments)
    .where(whereClause)
    .orderBy(departments.name);
}

export async function findById(
  id: string,
): Promise<DepartmentRow | undefined> {
  const result = await db
    .select()
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);
  return result[0];
}

export async function findByName(
  name: string,
): Promise<DepartmentRow | undefined> {
  const result = await db
    .select()
    .from(departments)
    .where(eq(departments.name, name))
    .limit(1);
  return result[0];
}

export async function findBySlug(
  slug: string,
): Promise<DepartmentRow | undefined> {
  const result = await db
    .select()
    .from(departments)
    .where(eq(departments.slug, slug))
    .limit(1);
  return result[0];
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function create(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}): Promise<DepartmentRow> {
  const result = await db.insert(departments).values(data).returning();
  return result[0];
}

export async function update(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    icon: string;
    isActive: boolean;
  }>,
): Promise<DepartmentRow | undefined> {
  const result = await db
    .update(departments)
    .set(data)
    .where(eq(departments.id, id))
    .returning();
  return result[0];
}

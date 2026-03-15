import { eq, and, or, ilike, inArray, count, sql } from "drizzle-orm";
import { db } from "../../config";
import { services } from "./service.schema";
import { serviceRequests } from "../serviceRequests/requests.schema";
import { categories } from "../serviceCategories/category.schema";
import { departments } from "../departments/department.schema";
import type { InferSelectModel } from "drizzle-orm";

export type ServiceRow = InferSelectModel<typeof services>;

// ---------------------------------------------------------------------------
// Finders
// ---------------------------------------------------------------------------

export async function findAll(opts: {
  page: number;
  limit: number;
  includeInactive?: boolean;
}): Promise<{ rows: ServiceRow[]; total: number }> {
  const { page, limit, includeInactive } = opts;
  const offset = (page - 1) * limit;

  const whereClause = includeInactive ? undefined : eq(services.isActive, true);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(services)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(services.name),
    db.select({ total: count() }).from(services).where(whereClause),
  ]);

  return { rows, total };
}

export async function findById(id: string): Promise<ServiceRow | undefined> {
  const result = await db
    .select()
    .from(services)
    .where(eq(services.id, id))
    .limit(1);
  return result[0];
}

export async function findByName(
  name: string,
  departmentId: string,
): Promise<ServiceRow | undefined> {
  const result = await db
    .select()
    .from(services)
    .where(
      and(eq(services.name, name), eq(services.departmentId, departmentId)),
    )
    .limit(1);
  return result[0];
}

export async function findBySlug(
  slug: string,
): Promise<ServiceRow | undefined> {
  const result = await db
    .select()
    .from(services)
    .where(eq(services.slug, slug))
    .limit(1);
  return result[0];
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function search(opts: {
  q: string;
  page: number;
  limit: number;
}): Promise<{ rows: ServiceRow[]; total: number }> {
  const { q, page, limit } = opts;
  const offset = (page - 1) * limit;
  const pattern = `%${q}%`;

  const whereClause = and(
    eq(services.isActive, true),
    or(ilike(services.name, pattern), ilike(services.description, pattern)),
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(services)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(services.name),
    db.select({ total: count() }).from(services).where(whereClause),
  ]);

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Filter by category / department
// ---------------------------------------------------------------------------

export async function findByCategory(opts: {
  categoryId: string;
  page: number;
  limit: number;
}): Promise<{ rows: ServiceRow[]; total: number }> {
  const { categoryId, page, limit } = opts;
  const offset = (page - 1) * limit;

  const whereClause = and(
    eq(services.isActive, true),
    eq(services.categoryId, categoryId),
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(services)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(services.name),
    db.select({ total: count() }).from(services).where(whereClause),
  ]);

  return { rows, total };
}

export async function findByDepartment(opts: {
  departmentId: string;
  page: number;
  limit: number;
}): Promise<{ rows: ServiceRow[]; total: number }> {
  const { departmentId, page, limit } = opts;
  const offset = (page - 1) * limit;

  const whereClause = and(
    eq(services.isActive, true),
    eq(services.departmentId, departmentId),
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(services)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(services.name),
    db.select({ total: count() }).from(services).where(whereClause),
  ]);

  return { rows, total };
}

// ---------------------------------------------------------------------------
// Existence checks
// ---------------------------------------------------------------------------

export async function categoryExists(id: string): Promise<boolean> {
  const result = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return result.length > 0;
}

export async function departmentExists(id: string): Promise<boolean> {
  const result = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);
  return result.length > 0;
}

// ---------------------------------------------------------------------------
// Grouped queries
// ---------------------------------------------------------------------------

export async function findGroupedByCategory(limitPerGroup: number): Promise<
  Array<{
    category: { id: string; name: string; description: string };
    services: ServiceRow[];
  }>
> {
  const rows = await db
    .select({
      service: services,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryDescription: categories.description,
    })
    .from(categories)
    .leftJoin(
      services,
      and(eq(services.categoryId, categories.id), eq(services.isActive, true)),
    )
    .where(eq(categories.isActive, true))
    .orderBy(categories.name, services.name);

  const map = new Map<
    string,
    {
      category: { id: string; name: string; description: string };
      services: ServiceRow[];
    }
  >();

  for (const row of rows) {
    const key = row.categoryId;
    if (!map.has(key)) {
      map.set(key, {
        category: {
          id: row.categoryId,
          name: row.categoryName,
          description: row.categoryDescription,
        },
        services: [],
      });
    }
    const group = map.get(key)!;
    if (
      row.service &&
      row.service.id !== null &&
      group.services.length < limitPerGroup
    ) {
      group.services.push(row.service);
    }
  }

  return Array.from(map.values());
}

export async function findGroupedByDepartment(limitPerGroup: number): Promise<
  Array<{
    department: { id: string; name: string };
    services: ServiceRow[];
  }>
> {
  const rows = await db
    .select({
      service: services,
      departmentId: departments.id,
      departmentName: departments.name,
    })
    .from(departments)
    .leftJoin(
      services,
      and(
        eq(services.departmentId, departments.id),
        eq(services.isActive, true),
      ),
    )
    .where(eq(departments.isActive, true))
    .orderBy(departments.name, services.name);

  const map = new Map<
    string,
    { department: { id: string; name: string }; services: ServiceRow[] }
  >();

  for (const row of rows) {
    const key = row.departmentId;
    if (!map.has(key)) {
      map.set(key, {
        department: { id: row.departmentId, name: row.departmentName },
        services: [],
      });
    }
    const group = map.get(key)!;
    if (
      row.service &&
      row.service.id !== null &&
      group.services.length < limitPerGroup
    ) {
      group.services.push(row.service);
    }
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function create(data: {
  name: string;
  slug: string;
  description?: string;
  instructions?: string;
  categoryId: string;
  departmentId: string;
  minResponseDays?: number;
  maxResponseDays?: number;
}): Promise<ServiceRow> {
  const result = await db.insert(services).values(data).returning();
  return result[0];
}

export async function update(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    instructions: string;
    categoryId: string;
    departmentId: string;
    minResponseDays: number;
    maxResponseDays: number;
    isActive: boolean;
  }>,
): Promise<ServiceRow | undefined> {
  const result = await db
    .update(services)
    .set(data)
    .where(eq(services.id, id))
    .returning();
  return result[0];
}

export async function remove(id: string): Promise<void> {
  await db.delete(services).where(eq(services.id, id));
}

// ---------------------------------------------------------------------------
// Delete guard
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES = [
  "open",
  "in_progress",
  "under_review",
  "pending_review",
] as const;

export async function hasActiveRequests(serviceId: string): Promise<boolean> {
  const result = await db
    .select({ total: count() })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.serviceId, serviceId),
        inArray(serviceRequests.status, [...ACTIVE_STATUSES]),
      ),
    );
  return result[0].total > 0;
}

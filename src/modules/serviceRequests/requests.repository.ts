import { eq, and, count } from "drizzle-orm";
import { db } from "../../config";
import { serviceRequests } from "./requests.schema";
import { services } from "../services/service.schema";
import { users } from "../users/users.schema";
import type { InferSelectModel, InferInsertModel, SQL } from "drizzle-orm";

export type RequestRow = InferSelectModel<typeof serviceRequests>;
type RequestUpdate = Partial<InferInsertModel<typeof serviceRequests>>;

// ---------------------------------------------------------------------------
// Finders
// ---------------------------------------------------------------------------

export async function findById(id: string): Promise<RequestRow | undefined> {
  const result = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, id))
    .limit(1);
  return result[0];
}

export async function findAllForUser(opts: {
  userId: string;
  status?: string;
  page: number;
  limit: number;
}): Promise<{ rows: RequestRow[]; total: number }> {
  const { userId, status, page, limit } = opts;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [eq(serviceRequests.userId, userId)];
  if (status) {
    conditions.push(eq(serviceRequests.status, status as RequestRow["status"]));
  }
  const whereClause = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(serviceRequests)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(serviceRequests.createdAt),
    db.select({ total: count() }).from(serviceRequests).where(whereClause),
  ]);

  return { rows, total };
}

export async function findAll(opts: {
  status?: string;
  serviceId?: string;
  departmentId?: string;
  userId?: string;
  page: number;
  limit: number;
}): Promise<{ rows: RequestRow[]; total: number }> {
  const { status, serviceId, departmentId, userId, page, limit } = opts;
  const offset = (page - 1) * limit;

  const baseConditions: SQL[] = [];
  if (status) {
    baseConditions.push(
      eq(serviceRequests.status, status as RequestRow["status"]),
    );
  }
  if (serviceId) {
    baseConditions.push(eq(serviceRequests.serviceId, serviceId));
  }
  if (userId) {
    baseConditions.push(eq(serviceRequests.userId, userId));
  }

  if (departmentId) {
    const deptConditions = [
      ...baseConditions,
      eq(services.departmentId, departmentId),
    ];
    const whereClause = and(...deptConditions);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ serviceRequests })
        .from(serviceRequests)
        .innerJoin(services, eq(serviceRequests.serviceId, services.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(serviceRequests.createdAt),
      db
        .select({ total: count() })
        .from(serviceRequests)
        .innerJoin(services, eq(serviceRequests.serviceId, services.id))
        .where(whereClause),
    ]);

    return { rows: rows.map((r) => r.serviceRequests), total };
  }

  const whereClause =
    baseConditions.length > 0 ? and(...baseConditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(serviceRequests)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(serviceRequests.createdAt),
    db.select({ total: count() }).from(serviceRequests).where(whereClause),
  ]);

  return { rows, total };
}

export async function findUserById(
  id: string,
): Promise<{ email: string; firstName: string; lastName: string } | undefined> {
  const result = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0];
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function create(data: {
  userId: string;
  serviceId: string;
  title: string;
  description: string;
  location?: { address?: string; lat?: number; lng?: number };
  attachments?: string[];
}): Promise<RequestRow> {
  const result = await db
    .insert(serviceRequests)
    .values({
      userId: data.userId,
      serviceId: data.serviceId,
      title: data.title,
      description: data.description,
      location: data.location,
      attachments: data.attachments,
    })
    .returning();
  return result[0];
}

export async function updateStatus(
  id: string,
  data: { status: RequestRow["status"]; note?: string; resolvedAt?: Date },
): Promise<RequestRow | undefined> {
  const setData: RequestUpdate = { status: data.status };
  if (data.note !== undefined) setData.note = data.note;
  if (data.resolvedAt !== undefined) setData.resolvedAt = data.resolvedAt;

  const result = await db
    .update(serviceRequests)
    .set(setData)
    .where(eq(serviceRequests.id, id))
    .returning();
  return result[0];
}

export async function cancel(
  id: string,
  note?: string,
): Promise<RequestRow | undefined> {
  const setData: RequestUpdate = { status: "closed" };
  if (note !== undefined) setData.note = note;

  const result = await db
    .update(serviceRequests)
    .set(setData)
    .where(eq(serviceRequests.id, id))
    .returning();
  return result[0];
}

// ---------------------------------------------------------------------------
// Existence checks
// ---------------------------------------------------------------------------

export async function serviceExists(id: string): Promise<boolean> {
  const result = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.id, id))
    .limit(1);
  return result.length > 0;
}

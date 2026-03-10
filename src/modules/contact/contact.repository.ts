import { eq, desc } from "drizzle-orm";
import { db } from "../../config";
import { contactMessages } from "./contact.schema";
import type { InferSelectModel } from "drizzle-orm";
import type { UpdateContactStatusBody } from "../../zodschemas/contact";

export type ContactMessageRow = InferSelectModel<typeof contactMessages>;

export async function findAll(): Promise<ContactMessageRow[]> {
  return db
    .select()
    .from(contactMessages)
    .orderBy(desc(contactMessages.createdAt));
}

export async function findById(
  id: string,
): Promise<ContactMessageRow | undefined> {
  const result = await db
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.id, id))
    .limit(1);
  return result[0];
}

export async function create(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  ipAddress?: string;
}): Promise<ContactMessageRow> {
  const result = await db.insert(contactMessages).values(data).returning();
  return result[0];
}

export async function updateStatus(
  id: string,
  status: UpdateContactStatusBody["status"],
): Promise<ContactMessageRow | undefined> {
  const result = await db
    .update(contactMessages)
    .set({ status })
    .where(eq(contactMessages.id, id))
    .returning();
  return result[0];
}

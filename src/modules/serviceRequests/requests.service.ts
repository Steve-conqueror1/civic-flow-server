import { Schema } from "./../../../node_modules/type-fest/source/schema.d";
import { randomUUID } from "crypto";
import path from "path";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../../config/s3.config";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import { sendEmail } from "../../utils/email";
import * as requestRepo from "./requests.repository";
import type { RequestRow } from "./requests.repository";
import type {
  CreateRequestBody,
  UpdateRequestStatusBody,
  CitizenRequestQuery,
  AdminRequestQuery,
} from "../../zodschemas/serviceRequests";

import { generateText } from "ai";
import { openai } from "../../config/ai";
import { redisClient } from "../../config/redis";

type Pagination = { page: number; limit: number; total: number };

// ---------------------------------------------------------------------------
// S3 helpers
// ---------------------------------------------------------------------------

const PRESIGNED_URL_EXPIRY = 604800; // 7 days

export async function uploadFilesToS3(
  files: Express.Multer.File[],
): Promise<string[]> {
  const keys: string[] = [];

  for (const file of files) {
    const ext = path.extname(file.originalname);
    const key = `service-requests/${randomUUID()}${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    keys.push(key);
  }

  return keys;
}

export async function generatePresignedUrls(keys: string[]): Promise<string[]> {
  const urls: string[] = [];

  for (const key of keys) {
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }),
      { expiresIn: PRESIGNED_URL_EXPIRY },
    );
    urls.push(url);
  }

  return urls;
}

// ---------------------------------------------------------------------------
// Hydrate attachment keys → pre-signed URLs on a single row
// ---------------------------------------------------------------------------

async function hydrateAttachments(row: RequestRow): Promise<RequestRow> {
  if (!row.attachments || row.attachments.length === 0) return row;
  const urls = await generatePresignedUrls(row.attachments);
  return { ...row, attachments: urls };
}

async function hydrateAttachmentsList(
  rows: RequestRow[],
): Promise<RequestRow[]> {
  return Promise.all(rows.map(hydrateAttachments));
}

// ---------------------------------------------------------------------------
// Business functions
// ---------------------------------------------------------------------------

export async function createRequest(
  userId: string,
  data: CreateRequestBody,
): Promise<RequestRow> {
  const exists = await requestRepo.serviceExists(data.serviceId);
  if (!exists) {
    throw new AppError(404, "Service not found.");
  }

  const row = await requestRepo.create({ userId, ...data });
  return hydrateAttachments(row);
}

export async function getRequestById(
  requestId: string,
  callerId: string,
  callerRole: string,
): Promise<RequestRow> {
  const row = await requestRepo.findById(requestId);
  if (!row) {
    throw new AppError(404, "Request not found.");
  }

  if (callerRole === "citizen" && row.userId !== callerId) {
    throw new AppError(403, "Access denied.");
  }

  return hydrateAttachments(row);
}

export async function listRequestsForUser(
  userId: string,
  query: CitizenRequestQuery,
): Promise<{ requests: RequestRow[]; pagination: Pagination }> {
  const { rows, total } = await requestRepo.findAllForUser({
    userId,
    status: query.status,
    page: query.page,
    limit: query.limit,
  });

  return {
    requests: await hydrateAttachmentsList(rows),
    pagination: { page: query.page, limit: query.limit, total },
  };
}

export async function listAllRequests(
  query: AdminRequestQuery,
): Promise<{ requests: RequestRow[]; pagination: Pagination }> {
  const { rows, total } = await requestRepo.findAll({
    status: query.status,
    serviceId: query.serviceId,
    departmentId: query.departmentId,
    userId: query.userId,
    page: query.page,
    limit: query.limit,
  });

  return {
    requests: await hydrateAttachmentsList(rows),
    pagination: { page: query.page, limit: query.limit, total },
  };
}

export async function updateRequestStatus(
  requestId: string,
  data: UpdateRequestStatusBody,
): Promise<RequestRow> {
  const existing = await requestRepo.findById(requestId);
  if (!existing) {
    throw new AppError(404, "Request not found.");
  }

  const resolvedAt = data.status === "resolved" ? new Date() : undefined;

  const updated = await requestRepo.updateStatus(requestId, {
    status: data.status,
    note: data.note,
    resolvedAt,
  });

  // Fire-and-forget email notification
  const user = await requestRepo.findUserById(existing.userId);
  if (user) {
    const html = `
      <h2>Your service request has been updated</h2>
      <p>Dear ${user.firstName},</p>
      <p>Your request "<strong>${existing.title}</strong>" status has been updated to <strong>${data.status.replace(/_/g, " ")}</strong>.</p>
      <p>Log in to CivicFlow to view the full details.</p>
    `;
    sendEmail(
      user.email,
      "Your service request status was updated",
      html,
    ).catch((err) => {
      console.error("Failed to send status update email:", err);
    });
  }

  return hydrateAttachments(updated!);
}

export async function cancelRequest(
  requestId: string,
  userId: string,
  note?: string,
): Promise<RequestRow> {
  const existing = await requestRepo.findById(requestId);
  if (!existing) {
    throw new AppError(404, "Request not found.");
  }

  if (existing.userId !== userId) {
    throw new AppError(403, "Access denied.");
  }

  // "closed" is used for both admin-closed and citizen-cancelled requests
  const terminalStatuses = ["closed", "resolved", "rejected"];
  if (terminalStatuses.includes(existing.status)) {
    throw new AppError(
      409,
      "Request cannot be cancelled in its current status.",
    );
  }

  const updated = await requestRepo.cancel(requestId, note);
  return hydrateAttachments(updated!);
}

const FEATURED_CASE_CACHE_KEY = "service_requests:featured_case";
const FEATURED_CASE_TTL = 100;

export async function getFeaturedCase() {
  const cached = await redisClient.get(FEATURED_CASE_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  const recentCases = await requestRepo.getRecentCases();
  if (recentCases.length === 0) {
    return null;
  }

  const casesForAI = recentCases.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    note: c.note,
    aiSummary: c.aiSummary,
    address: c.location?.address,
  }));

  const { text: selectedId } = await generateText({
    model: openai("gpt-5-nano"),
    prompt: `
    You are selecting ONE community service request request for a civicFlow App showcase.

    Selection rules:

    * Choose a RANDOM case from the list provided.
    * Prefer cases that were created recently when possible.
    * Do not prioritize impact, urgency, or category — randomness is the primary goal.
    * Ensure the case has a clear and appropriate public description.

    Return ONLY the ID of the selected case.

    Cases:  ${JSON.stringify(casesForAI)}
     `,
  });

  const featuredCase =
    recentCases.find((c) => c.id === selectedId) || recentCases[0];

  await redisClient.set(FEATURED_CASE_CACHE_KEY, JSON.stringify(featuredCase), {
    EX: FEATURED_CASE_TTL,
  });

  return featuredCase;
}

import axios from "axios";
import { AppError } from "../../shared/errors/AppError";
import { env } from "../../config";
import { sendEmail } from "../../utils/email";
import * as contactRepo from "./contact.repository";
import type { ContactMessageRow } from "./contact.repository";
import type {
  SubmitContactBody,
  UpdateContactStatusBody,
} from "../../zodschemas/contact";
import { TURNSTILE_VERIFY_URL } from "../../utils/constants";

export async function submitContactMessage(
  data: SubmitContactBody,
  ipAddress?: string,
): Promise<ContactMessageRow> {
  let verifyResponse: { data: { success: boolean } };
  try {
    verifyResponse = await axios.post<{ success: boolean }>(
      TURNSTILE_VERIFY_URL,
      new URLSearchParams({
        secret: env.TURNSTILE_SECRET!,
        response: data.turnstileToken,
        ...(ipAddress ? { remoteip: ipAddress } : {}),
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000,
      },
    );
  } catch {
    throw new AppError(
      503,
      "Bot verification service unavailable. Please try again.",
    );
  }

  if (!verifyResponse.data.success) {
    throw new AppError(422, "Turnstile verification failed.");
  }

  const record = await contactRepo.create({
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    ipAddress,
  });

  sendEmail(
    data.email,
    "We received your message",
    `<p>Hi ${data.name},</p>
     <p>Thank you for contacting us. We have received your message regarding
     "<strong>${data.subject}</strong>" and will get back to you shortly.</p>`,
  ).catch((err: unknown) => {
    console.error("[contact] Confirmation email failed:", err);
  });

  return record;
}

export async function listContactMessages(): Promise<ContactMessageRow[]> {
  return contactRepo.findAll();
}

export async function updateContactStatus(
  id: string,
  data: UpdateContactStatusBody,
): Promise<ContactMessageRow> {
  const updated = await contactRepo.updateStatus(id, data.status);
  if (!updated) {
    throw new AppError(404, "Contact message not found.");
  }

  return updated;
}

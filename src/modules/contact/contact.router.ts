import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rabc.middleware";
import { contactRateLimiter } from "../../middleware/rateLimit.middleware";
import { USER_ROLES } from "../../utils/constants";
import {
  submitContactHandler,
  listContactMessagesHandler,
  updateContactStatusHandler,
} from "./contact.controller";

const router = Router();

/**
 * @openapi
 * /v1/contact:
 *   post:
 *     tags: [Contact]
 *     summary: Submit a contact enquiry (rate-limited)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, subject, message, turnstileToken]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               email:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *                 maxLength: 255
 *               message:
 *                 type: string
 *                 maxLength: 5000
 *               turnstileToken:
 *                 type: string
 *                 description: Cloudflare Turnstile CAPTCHA token
 *     responses:
 *       201:
 *         description: Contact message submitted
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       429:
 *         description: Rate limit exceeded
 */
router.post("/", contactRateLimiter, submitContactHandler);

/**
 * @openapi
 * /v1/contact:
 *   get:
 *     tags: [Contact]
 *     summary: List all contact messages
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of contact messages
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 */
router.get(
  "/",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  listContactMessagesHandler,
);

/**
 * @openapi
 * /v1/contact/{id}/status:
 *   patch:
 *     tags: [Contact]
 *     summary: Update contact message status
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, read, replied, archived]
 *     responses:
 *       200:
 *         description: Contact message status updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       404:
 *         description: Contact message not found
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  updateContactStatusHandler,
);

export default router;

import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { analyseRequestHandler } from "./ai.controller";

const router = Router();

/**
 * @openapi
 * /v1/ai/analyse-request:
 *   post:
 *     tags: [AI]
 *     summary: Analyse a citizen request before submission
 *     description: Uses AI to match the request to the best category and service, provide a summary, and flag potential issues.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Analysis result with category, service, summary, and alerts
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       503:
 *         description: AI service unavailable
 */
router.post("/analyse-request", authenticate, analyseRequestHandler);

export default router;

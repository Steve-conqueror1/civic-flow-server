import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rabc.middleware";
import { AppError } from "../../shared/errors/AppError";
import {
  uploadAttachmentsHandler,
  createRequestHandler,
  listRequestsHandler,
  getRequestHandler,
  updateRequestStatusHandler,
  cancelRequestHandler,
} from "./requests.controller";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `File type not allowed: ${file.mimetype}`));
    }
  },
});

const router = Router();

// ---------------------------------------------------------------------------
// Static paths first
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /v1/service-requests/upload:
 *   post:
 *     tags: [Service Requests]
 *     summary: Upload attachments for a service request
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 4
 *                 description: "Max 4 files, 10 MB each. Allowed: JPEG, PNG, WebP, PDF"
 *     responses:
 *       200:
 *         description: Files uploaded — returns array of URLs
 *       400:
 *         description: Invalid file type or too many files
 *       401:
 *         description: Not authenticated
 */
router.post(
  "/upload",
  authenticate,
  upload.array("files", 4),
  uploadAttachmentsHandler,
);

/**
 * @openapi
 * /v1/service-requests:
 *   post:
 *     tags: [Service Requests]
 *     summary: Create a new service request
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, title, description]
 *             properties:
 *               serviceId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 4
 *     responses:
 *       201:
 *         description: Service request created
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Not authenticated
 */
router.post("/", authenticate, createRequestHandler);

/**
 * @openapi
 * /v1/service-requests:
 *   get:
 *     tags: [Service Requests]
 *     summary: List service requests
 *     description: Citizens see their own requests. Admins can filter by service, department, or user.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, under_review, pending_review, resolved, rejected, closed]
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by service (admin only)
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by department (admin only)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user (admin only)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of service requests
 *       401:
 *         description: Not authenticated
 */
router.get("/", authenticate, listRequestsHandler);

// ---------------------------------------------------------------------------
// Parameterised paths
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /v1/service-requests/{id}:
 *   get:
 *     tags: [Service Requests]
 *     summary: Get a service request by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Service request details
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Request not found
 */
router.get("/:id", authenticate, getRequestHandler);

/**
 * @openapi
 * /v1/service-requests/{id}/cancel:
 *   patch:
 *     tags: [Service Requests]
 *     summary: Cancel a service request
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request cancelled
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Request not found
 */
router.patch("/:id/cancel", authenticate, cancelRequestHandler);

/**
 * @openapi
 * /v1/service-requests/{id}/status:
 *   patch:
 *     tags: [Service Requests]
 *     summary: Update service request status (admin)
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
 *                 enum: [open, in_progress, under_review, pending_review, resolved, rejected, closed]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request status updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       404:
 *         description: Request not found
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin", "super_admin"),
  updateRequestStatusHandler,
);

export default router;

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
router.post(
  "/upload",
  authenticate,
  upload.array("files", 4),
  uploadAttachmentsHandler,
);
router.post("/", authenticate, createRequestHandler);
router.get("/", authenticate, listRequestsHandler);

// ---------------------------------------------------------------------------
// Parameterised paths
// ---------------------------------------------------------------------------
router.get("/:id", authenticate, getRequestHandler);
router.patch("/:id/cancel", authenticate, cancelRequestHandler);
router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin", "super_admin"),
  updateRequestStatusHandler,
);

export default router;

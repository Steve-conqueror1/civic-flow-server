import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rabc.middleware";
import {
  getMeHandler,
  updateMeHandler,
  deleteMeHandler,
  listUsersHandler,
  getUserByIdHandler,
  adminUpdateUserHandler,
  deactivateUserHandler,
  adminDeleteUserHandler,
} from "./users.controller";

const router = Router();

// ---------------------------------------------------------------------------
// Self-service routes — /me MUST come before /:id
// ---------------------------------------------------------------------------
router.get("/me", authenticate, getMeHandler);
router.patch("/me", authenticate, updateMeHandler);
router.delete("/me", authenticate, deleteMeHandler);

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------
router.get(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  listUsersHandler,
);
router.get(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  getUserByIdHandler,
);
router.patch(
  "/:id/deactivate",
  authenticate,
  requireRole("admin", "super_admin"),
  deactivateUserHandler,
);
router.patch(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  adminUpdateUserHandler,
);
router.delete(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  adminDeleteUserHandler,
);

export default router;

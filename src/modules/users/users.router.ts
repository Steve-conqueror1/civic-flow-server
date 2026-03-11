import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rabc.middleware";
import { USER_ROLES } from "../../utils/constants";
import {
  getMeHandler,
  updateMeHandler,
  deleteMeHandler,
  getActiveCitizenCountHandler,
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
// Public routes — /count MUST come before /:id
// ---------------------------------------------------------------------------
router.get("/count", getActiveCitizenCountHandler);

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------
router.get(
  "/",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  listUsersHandler,
);
router.get(
  "/:id",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  getUserByIdHandler,
);
router.patch(
  "/:id/deactivate",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  deactivateUserHandler,
);
router.patch(
  "/:id",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  adminUpdateUserHandler,
);
router.delete(
  "/:id",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  adminDeleteUserHandler,
);

export default router;

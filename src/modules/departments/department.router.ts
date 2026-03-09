import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rabc.middleware";
import { USER_ROLES } from "../../utils/constants";
import {
  listDepartmentsHandler,
  getDepartmentByIdHandler,
  createDepartmentHandler,
  updateDepartmentHandler,
  setDepartmentStatusHandler,
} from "./department.controller";

const router = Router();

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------
router.get("/", optionalAuthenticate, listDepartmentsHandler);
router.get("/:id", getDepartmentByIdHandler);

// ---------------------------------------------------------------------------
// Admin routes — static paths before parameterised paths
// ---------------------------------------------------------------------------
router.post(
  "/",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  createDepartmentHandler,
);
router.patch(
  "/:id/status",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  setDepartmentStatusHandler,
);
router.patch(
  "/:id",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  updateDepartmentHandler,
);

export default router;

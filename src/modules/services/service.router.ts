import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rabc.middleware";
import {
  listServicesHandler,
  searchServicesHandler,
  getGroupedByCategoryHandler,
  getGroupedByDepartmentHandler,
  listByCategoryHandler,
  listByDepartmentHandler,
  getServiceHandler,
  createServiceHandler,
  updateServiceHandler,
  deleteServiceHandler,
  activateServiceHandler,
  deactivateServiceHandler,
} from "./service.controller";

const router = Router();

// ---------------------------------------------------------------------------
// Public routes — static paths MUST come before parameterised paths
// ---------------------------------------------------------------------------
router.get("/", optionalAuthenticate, listServicesHandler);
router.get("/search", searchServicesHandler);
router.get("/grouped/category", getGroupedByCategoryHandler);
router.get("/grouped/department", getGroupedByDepartmentHandler);
router.get("/category/:categoryId", listByCategoryHandler);
router.get("/department/:departmentId", listByDepartmentHandler);
router.get("/:id", getServiceHandler);

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------
router.post(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  createServiceHandler,
);
router.patch(
  "/:id/activate",
  authenticate,
  requireRole("admin", "super_admin"),
  activateServiceHandler,
);
router.patch(
  "/:id/deactivate",
  authenticate,
  requireRole("admin", "super_admin"),
  deactivateServiceHandler,
);
router.patch(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  updateServiceHandler,
);
router.delete(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  deleteServiceHandler,
);

export default router;

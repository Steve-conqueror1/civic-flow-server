import { Router } from "express";
import {
  listCategoriesHandler,
  getCategoryHandler,
  createCategoryHandler,
  updateCategoryHandler,
  updateCategoryStatusHandler,
} from "./category.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { optionalAuthenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rabc.middleware";

const router = Router();

// Public routes
router.get("/", listCategoriesHandler);
router.get("/:id", optionalAuthenticate, getCategoryHandler);

// Admin routes
router.post(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  createCategoryHandler,
);
router.patch(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  updateCategoryHandler,
);
router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin", "super_admin"),
  updateCategoryStatusHandler,
);

export default router;

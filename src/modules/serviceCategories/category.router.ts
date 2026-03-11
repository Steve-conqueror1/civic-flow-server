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

/**
 * @openapi
 * /v1/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all service categories
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/", listCategoriesHandler);

/**
 * @openapi
 * /v1/categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a category by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get("/:id", optionalAuthenticate, getCategoryHandler);

/**
 * @openapi
 * /v1/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new service category
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       409:
 *         description: Category name already exists
 */
router.post(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  createCategoryHandler,
);

/**
 * @openapi
 * /v1/categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category
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
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Category updated
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       404:
 *         description: Category not found
 */
router.patch(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  updateCategoryHandler,
);

/**
 * @openapi
 * /v1/categories/{id}/status:
 *   patch:
 *     tags: [Categories]
 *     summary: Activate or deactivate a category
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
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category status updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       404:
 *         description: Category not found
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin", "super_admin"),
  updateCategoryStatusHandler,
);

export default router;

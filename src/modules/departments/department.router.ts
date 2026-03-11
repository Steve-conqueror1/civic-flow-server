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

/**
 * @openapi
 * /v1/departments:
 *   get:
 *     tags: [Departments]
 *     summary: List all departments
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive departments (admin only)
 *     responses:
 *       200:
 *         description: List of departments
 */
router.get("/", optionalAuthenticate, listDepartmentsHandler);

/**
 * @openapi
 * /v1/departments/{id}:
 *   get:
 *     tags: [Departments]
 *     summary: Get a department by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Department details
 *       404:
 *         description: Department not found
 */
router.get("/:id", getDepartmentByIdHandler);

// ---------------------------------------------------------------------------
// Admin routes — static paths before parameterised paths
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /v1/departments:
 *   post:
 *     tags: [Departments]
 *     summary: Create a new department
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
 *                 maxLength: 2000
 *               icon:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: Department created
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
 *         description: Department name already exists
 */
router.post(
  "/",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  createDepartmentHandler,
);

/**
 * @openapi
 * /v1/departments/{id}/status:
 *   patch:
 *     tags: [Departments]
 *     summary: Activate or deactivate a department
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
 *         description: Department status updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       404:
 *         description: Department not found
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  setDepartmentStatusHandler,
);

/**
 * @openapi
 * /v1/departments/{id}:
 *   patch:
 *     tags: [Departments]
 *     summary: Update a department
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
 *                 maxLength: 2000
 *               icon:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Department updated
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
 *         description: Department not found
 */
router.patch(
  "/:id",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  updateDepartmentHandler,
);

export default router;

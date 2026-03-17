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
  getPopularServicesHandler,
  getServiceBySlugHandler,
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

/**
 * @openapi
 * /v1/services:
 *   get:
 *     tags: [Services]
 *     summary: List all services (paginated)
 *     parameters:
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
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive services (admin only)
 *     responses:
 *       200:
 *         description: Paginated list of services
 */
router.get("/", optionalAuthenticate, listServicesHandler);

/**
 * @openapi
 * /v1/services/search:
 *   get:
 *     tags: [Services]
 *     summary: Search services by keyword
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
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
 *         description: Search results with pagination
 *       400:
 *         description: Missing or empty search query
 */
router.get("/search", searchServicesHandler);

/**
 * @openapi
 * /v1/services/grouped/category:
 *   get:
 *     tags: [Services]
 *     summary: Get services grouped by category
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Max services per group
 *     responses:
 *       200:
 *         description: Services grouped by category
 */
router.get("/grouped/category", getGroupedByCategoryHandler);

/**
 * @openapi
 * /v1/services/grouped/department:
 *   get:
 *     tags: [Services]
 *     summary: Get services grouped by department
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Max services per group
 *     responses:
 *       200:
 *         description: Services grouped by department
 */
router.get("/grouped/department", getGroupedByDepartmentHandler);

/**
 * @openapi
 * /v1/services/category/{categoryId}:
 *   get:
 *     tags: [Services]
 *     summary: List services by category
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Services in the specified category
 */
router.get("/category/:categoryId", listByCategoryHandler);

/**
 * @openapi
 * /v1/services/department/{departmentId}:
 *   get:
 *     tags: [Services]
 *     summary: List services by department
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Services in the specified department
 */
router.get("/department/:departmentId", listByDepartmentHandler);

/**
 * @openapi
 * /v1/services/id/{id}:
 *   get:
 *     tags: [Services]
 *     summary: Get a service by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Service details
 *       404:
 *         description: Service not found
 */
router.get("/id/:id", getServiceHandler);

/**
 * @openapi
 * /v1/services/popular:
 *   get:
 *     tags: [Services]
 *     summary: Get popular services ranked by request count
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 4
 *           minimum: 1
 *         description: Number of popular services to return
 *     responses:
 *       200:
 *         description: Popular services sorted by request count descending
 *       400:
 *         description: Invalid limit parameter
 */
router.get("/popular", getPopularServicesHandler);

/**
 * @openapi
 * /v1/services/{slug}:
 *   get:
 *     tags: [Services]
 *     summary: Get a service by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service details with department and category names
 *       404:
 *         description: Service not found
 */
router.get("/:slug", getServiceBySlugHandler);

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /v1/services:
 *   post:
 *     tags: [Services]
 *     summary: Create a new service
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, categoryId, departmentId]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               instructions:
 *                 type: string
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               minResponseDays:
 *                 type: integer
 *                 minimum: 1
 *               maxResponseDays:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Service created
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
 */
router.post(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  createServiceHandler,
);

/**
 * @openapi
 * /v1/services/{id}/activate:
 *   patch:
 *     tags: [Services]
 *     summary: Activate a service
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
 *         description: Service activated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       404:
 *         description: Service not found
 */
router.patch(
  "/:id/activate",
  authenticate,
  requireRole("admin", "super_admin"),
  activateServiceHandler,
);

/**
 * @openapi
 * /v1/services/{id}/deactivate:
 *   patch:
 *     tags: [Services]
 *     summary: Deactivate a service
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
 *         description: Service deactivated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       404:
 *         description: Service not found
 */
router.patch(
  "/:id/deactivate",
  authenticate,
  requireRole("admin", "super_admin"),
  deactivateServiceHandler,
);

/**
 * @openapi
 * /v1/services/{id}:
 *   patch:
 *     tags: [Services]
 *     summary: Update a service
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
 *               instructions:
 *                 type: string
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               minResponseDays:
 *                 type: integer
 *                 minimum: 1
 *               maxResponseDays:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Service updated
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
 *         description: Service not found
 */
router.patch(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  updateServiceHandler,
);

/**
 * @openapi
 * /v1/services/{id}:
 *   delete:
 *     tags: [Services]
 *     summary: Delete a service
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
 *         description: Service deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       404:
 *         description: Service not found
 */
router.delete(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  deleteServiceHandler,
);

export default router;

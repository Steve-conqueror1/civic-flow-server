import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rabc.middleware";
import { USER_ROLES } from "../../utils/constants";
import {
  getMeHandler,
  updateMeHandler,
  deleteMeHandler,
  getActiveCitizenCountHandler,
  getUserStatsHandler,
  listUsersHandler,
  getUserByIdHandler,
  adminUpdateUserHandler,
  activateUserHandler,
  deactivateUserHandler,
  suspendUserHandler,
  deleteUserStatusHandler,
  adminDeleteUserHandler,
} from "./users.controller";

const router = Router();

// ---------------------------------------------------------------------------
// Self-service routes — /me MUST come before /:id
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get your own profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *       401:
 *         description: Not authenticated
 */
router.get("/me", authenticate, getMeHandler);

/**
 * @openapi
 * /v1/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update your own profile
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *                 nullable: true
 *               address:
 *                 type: string
 *                 nullable: true
 *               mfaEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Not authenticated
 */
router.patch("/me", authenticate, updateMeHandler);

/**
 * @openapi
 * /v1/users/me:
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete your own account
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Cannot delete last super admin
 */
router.delete("/me", authenticate, deleteMeHandler);

// ---------------------------------------------------------------------------
// Public routes — /count MUST come before /:id
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /v1/users/count:
 *   get:
 *     tags: [Users]
 *     summary: Get the number of active citizen users
 *     responses:
 *       200:
 *         description: Active citizen count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 42
 */
router.get("/count", getActiveCitizenCountHandler);

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /v1/users/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get user statistics (total, staff, inactive, suspended)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     totalStaff:
 *                       type: integer
 *                     inactiveUsers:
 *                       type: integer
 *                     suspendedUsers:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 */
router.get(
  "/stats",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  getUserStatsHandler,
);

/**
 * @openapi
 * /v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (paginated, filterable)
 *     security:
 *       - cookieAuth: []
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [citizen, admin, super_admin]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended, deleted]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Paginated user list
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 */
router.get(
  "/",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  listUsersHandler,
);

/**
 * @openapi
 * /v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by ID
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
 *         description: User details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin or Super Admin role required
 *       404:
 *         description: User not found
 */
router.get(
  "/:id",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  getUserByIdHandler,
);

/**
 * @openapi
 * /v1/users/{id}/activate:
 *   patch:
 *     tags: [Users]
 *     summary: Set user status to active
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
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User activated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already active
 */
router.patch(
  "/:id/activate",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  activateUserHandler,
);

/**
 * @openapi
 * /v1/users/{id}/deactivate:
 *   patch:
 *     tags: [Users]
 *     summary: Set user status to inactive
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
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User deactivated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already inactive
 */
router.patch(
  "/:id/deactivate",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  deactivateUserHandler,
);

/**
 * @openapi
 * /v1/users/{id}/suspend:
 *   patch:
 *     tags: [Users]
 *     summary: Set user status to suspended
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
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User suspended
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already suspended
 */
router.patch(
  "/:id/suspend",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  suspendUserHandler,
);

/**
 * @openapi
 * /v1/users/{id}/delete:
 *   patch:
 *     tags: [Users]
 *     summary: Soft-delete a user account (set status to deleted)
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
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already deleted
 */
router.patch(
  "/:id/delete",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  deleteUserStatusHandler,
);

/**
 * @openapi
 * /v1/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Admin update a user's profile
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
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *                 nullable: true
 *               address:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [citizen, admin, super_admin]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
router.patch(
  "/:id",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  adminUpdateUserHandler,
);

/**
 * @openapi
 * /v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete a user account
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
 *         description: User deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
router.delete(
  "/:id",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  adminDeleteUserHandler,
);

export default router;

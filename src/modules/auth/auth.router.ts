import { Router } from "express";
import {
  registerHandler,
  verifyEmailHandler,
  loginHandler,
  verifyMfaHandler,
  refreshHandler,
  logoutHandler,
  resendVerificationHandler,
  requestPasswordResetHandler,
  resetPasswordHandler,
  setupMfaHandler,
  confirmMfaHandler,
  getCurrentUser,
} from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

/**
 * @openapi
 * /v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: User registered — verification email sent
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Email already registered
 */
router.post("/auth/register", registerHandler);

/**
 * @openapi
 * /v1/auth/verify-email:
 *   get:
 *     tags: [Auth]
 *     summary: Verify email address via token
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get("/auth/verify-email", verifyEmailHandler);

/**
 * @openapi
 * /v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful — sets access_token and refresh_token cookies
 *       202:
 *         description: MFA required — returns challengeToken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 mfaRequired:
 *                   type: boolean
 *                   example: true
 *                 challengeToken:
 *                   type: string
 *                   format: uuid
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account locked or email not verified
 */
router.post("/auth/login", loginHandler);

/**
 * @openapi
 * /v1/auth/mfa/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Complete MFA login with TOTP code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [challengeToken, totpCode]
 *             properties:
 *               challengeToken:
 *                 type: string
 *                 format: uuid
 *               totpCode:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: MFA verified — sets auth cookies
 *       400:
 *         description: Invalid or expired challenge token
 *       401:
 *         description: Invalid TOTP code
 */
router.post("/auth/mfa/verify", verifyMfaHandler);

/**
 * @openapi
 * /v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh the access token using refresh_token cookie
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or revoked refresh token
 */
router.post("/auth/refresh", refreshHandler);

/**
 * @openapi
 * /v1/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend email verification link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email sent (if account exists)
 */
router.post("/auth/resend-verification", resendVerificationHandler);

/**
 * @openapi
 * /v1/auth/request-password-reset:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent (if account exists)
 */
router.post("/auth/request-password-reset", requestPasswordResetHandler);

/**
 * @openapi
 * /v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 format: uuid
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/auth/reset-password", resetPasswordHandler);

// Authenticated routes

/**
 * @openapi
 * /v1/auth/mfa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Initiate MFA setup — returns TOTP secret and QR code URI
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: TOTP secret and otpauth URI returned
 *       401:
 *         description: Not authenticated
 */
router.post("/auth/mfa/setup", authenticate, setupMfaHandler);

/**
 * @openapi
 * /v1/auth/mfa/confirm:
 *   post:
 *     tags: [Auth]
 *     summary: Confirm MFA setup with a TOTP code
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [totpCode]
 *             properties:
 *               totpCode:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: MFA enabled successfully
 *       400:
 *         description: Invalid TOTP code
 *       401:
 *         description: Not authenticated
 */
router.post("/auth/mfa/confirm", authenticate, confirmMfaHandler);

/**
 * @openapi
 * /v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authenticated
 */
router.get("/auth/me", authenticate, getCurrentUser);

/**
 * @openapi
 * /v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out and clear auth cookies
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/auth/logout", logoutHandler);

export default router;

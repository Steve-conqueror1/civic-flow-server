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

// Public routes
router.post("/auth/register", registerHandler);
router.get("/auth/verify-email", verifyEmailHandler);
router.post("/auth/login", loginHandler);
router.post("/auth/mfa/verify", verifyMfaHandler);
router.post("/auth/refresh", refreshHandler);
router.post("/auth/resend-verification", resendVerificationHandler);
router.post("/auth/request-password-reset", requestPasswordResetHandler);
router.post("/auth/reset-password", resetPasswordHandler);

// Authenticated routes
router.post("/auth/mfa/setup", authenticate, setupMfaHandler);
router.post("/auth/mfa/confirm", authenticate, confirmMfaHandler);
router.get("/auth/me", authenticate, getCurrentUser);

router.post("/auth/logout", logoutHandler);

export default router;

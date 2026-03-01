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
} from "./auth.controller";

const router = Router();

router.post("/auth/register", registerHandler);
router.get("/auth/verify-email", verifyEmailHandler);
router.post("/auth/login", loginHandler);
router.post("/auth/mfa/verify", verifyMfaHandler);
router.post("/auth/refresh", refreshHandler);
router.post("/auth/resend-verification", resendVerificationHandler);
router.post("/auth/request-password-reset", requestPasswordResetHandler);
router.post("/auth/reset-password", resetPasswordHandler);

router.post("/auth/logout", logoutHandler);

export default router;

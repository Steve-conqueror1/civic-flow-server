import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rabc.middleware";
import { contactRateLimiter } from "../../middleware/rateLimit.middleware";
import { USER_ROLES } from "../../utils/constants";
import {
  submitContactHandler,
  listContactMessagesHandler,
  updateContactStatusHandler,
} from "./contact.controller";

const router = Router();

router.post("/", contactRateLimiter, submitContactHandler);

router.get(
  "/",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  listContactMessagesHandler,
);

router.patch(
  "/:id/status",
  authenticate,
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  updateContactStatusHandler,
);

export default router;

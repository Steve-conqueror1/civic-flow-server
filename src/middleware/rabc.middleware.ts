import { Request, Response, NextFunction } from "express";
import type { JwtAccessPayload } from "../types";

type UserRole = JwtAccessPayload["role"];

export const requireRole =
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required." });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res
        .status(403)
        .json({ success: false, message: "Insufficient permissions." });
      return;
    }
    next();
  };

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { JwtAccessPayload } from "../types";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.cookies["access_token"] as string | undefined;

  if (!token) {
    res
      .status(401)
      .json({ success: false, message: "Authentication required." });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtAccessPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }
    next(err);
  }
};

export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const token = req.cookies["access_token"] as string | undefined;
  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_SECRET) as JwtAccessPayload;
    } catch {
      // Silently continue — auth is optional
    }
  }
  next();
};

import type { Request, Response, NextFunction } from "express";

export function notFoundRouteMiddleware(
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  res.status(404).json({
    success: false,
    message: "Not found",
  });
}

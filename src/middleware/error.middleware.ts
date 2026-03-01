import { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/errors/AppError";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.meta ? { meta: err.meta } : {}),
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
  });
};

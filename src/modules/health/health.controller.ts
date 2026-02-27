import { NextFunction, Request, Response } from "express";

export const healthCheck = async (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timeStamp: new Date().toISOString(),
  });
};

import { Request, Response, NextFunction } from "express";
import { AnalyseRequestSchema } from "../../zodschemas/ai";
import * as aiService from "./ai.service";

export const analyseRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = AnalyseRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const userId = req.user!.sub;
    const result = await aiService.analyseRequest(userId, parsed.data);

    res.status(200).json({
      success: true,
      message: "Request analysis complete.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

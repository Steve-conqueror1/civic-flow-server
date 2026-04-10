import { Request, Response, NextFunction } from "express";
import { GeocodeQuerySchema } from "../../zodschemas/geocode";
import * as geocodeService from "./geocode.service";

export const geocodeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = GeocodeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { q, limit } = parsed.data;
    const results = await geocodeService.geocodeQuery(q, limit);

    res.status(200).json({
      success: true,
      data: { results },
    });
  } catch (err) {
    next(err);
  }
};

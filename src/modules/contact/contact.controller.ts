import { Request, Response, NextFunction } from "express";
import {
  SubmitContactSchema,
  ContactParamsSchema,
  UpdateContactStatusSchema,
} from "../../zodschemas/contact";
import * as contactService from "./contact.service";

export const submitContactHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = SubmitContactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const record = await contactService.submitContactMessage(
      parsed.data,
      req.ip,
    );

    res.status(201).json({
      success: true,
      message:
        "Your message has been received. We will be in touch shortly.",
      data: { id: record.id },
    });
  } catch (err) {
    next(err);
  }
};

export const listContactMessagesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const messages = await contactService.listContactMessages();

    res.status(200).json({
      success: true,
      message: "Contact messages retrieved successfully.",
      data: { messages },
    });
  } catch (err) {
    next(err);
  }
};

export const updateContactStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = ContactParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: params.error.flatten().fieldErrors,
      });
      return;
    }

    const parsed = UpdateContactStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const message = await contactService.updateContactStatus(
      params.data.id,
      parsed.data,
    );

    res.status(200).json({
      success: true,
      message: "Contact message status updated successfully.",
      data: { message },
    });
  } catch (err) {
    next(err);
  }
};

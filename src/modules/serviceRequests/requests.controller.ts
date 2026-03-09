import { Request, Response, NextFunction } from "express";
import {
  CreateRequestSchema,
  UpdateRequestStatusSchema,
  CancelRequestSchema,
  CitizenRequestQuerySchema,
  AdminRequestQuerySchema,
} from "../../zodschemas/serviceRequests";
import * as requestService from "./requests.service";

/**
 * @route   POST /api/v1/service-requests/upload
 * @desc    Upload attachments to S3 and return pre-signed URLs
 * @access  Authenticated
 */
export const uploadAttachmentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: "No files provided.",
      });
      return;
    }

    const urls = await requestService.uploadFilesToS3(files);

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully.",
      data: { urls },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/v1/service-requests
 * @desc    Create a new service request
 * @access  Authenticated
 */
export const createRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = CreateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const request_ = await requestService.createRequest(
      req.user!.sub,
      parsed.data,
    );

    res.status(201).json({
      success: true,
      message: "Service request created successfully.",
      data: { request: request_ },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/service-requests
 * @desc    List service requests (citizen sees own, admin sees all)
 * @access  Authenticated
 */
export const listRequestsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAdmin =
      req.user!.role === "admin" || req.user!.role === "super_admin";

    if (isAdmin) {
      const parsed = AdminRequestQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { requests, pagination } = await requestService.listAllRequests(
        parsed.data,
      );

      res.status(200).json({
        success: true,
        message: "Service requests retrieved successfully.",
        data: { requests, pagination },
      });
    } else {
      const parsed = CitizenRequestQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { requests, pagination } = await requestService.listRequestsForUser(
        req.user!.sub,
        parsed.data,
      );

      res.status(200).json({
        success: true,
        message: "Service requests retrieved successfully.",
        data: { requests, pagination },
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/service-requests/:id
 * @desc    Get a single service request by ID
 * @access  Authenticated (citizen: own only, admin: any)
 */
export const getRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const request_ = await requestService.getRequestById(
      req.params.id as string,
      req.user!.sub,
      req.user!.role,
    );

    res.status(200).json({
      success: true,
      message: "Service request retrieved successfully.",
      data: { request: request_ },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/service-requests/:id/status
 * @desc    Update the status of a service request
 * @access  Admin
 */
export const updateRequestStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = UpdateRequestStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const request_ = await requestService.updateRequestStatus(
      req.params.id as string,
      parsed.data,
    );

    res.status(200).json({
      success: true,
      message: "Request status updated successfully.",
      data: { request: request_ },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/service-requests/:id/cancel
 * @desc    Cancel a service request (citizen: own only)
 * @access  Authenticated
 */
export const cancelRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = CancelRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const request_ = await requestService.cancelRequest(
      req.params.id as string,
      req.user!.sub,
      parsed.data.note,
    );

    res.status(200).json({
      success: true,
      message: "Service request cancelled successfully.",
      data: { request: request_ },
    });
  } catch (err) {
    next(err);
  }
};

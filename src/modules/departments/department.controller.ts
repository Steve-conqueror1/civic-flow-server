import { Request, Response, NextFunction } from "express";
import { USER_ROLES } from "../../utils/constants";
import {
  DepartmentParamsSchema,
  CreateDepartmentSchema,
  UpdateDepartmentSchema,
  UpdateDepartmentStatusSchema,
  ListDepartmentsQuerySchema,
} from "../../zodschemas/departments";
import * as departmentService from "./department.service";

/**
 * @route   GET /api/v1/departments
 * @desc    List departments. Admins may pass ?includeInactive=true.
 * @access  Public
 */
export const listDepartmentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = ListDepartmentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const isAdmin =
      req.user?.role === USER_ROLES.ADMIN || req.user?.role === USER_ROLES.SUPER_ADMIN;
    const includeInactive = isAdmin && parsed.data.includeInactive === true;

    const departments = await departmentService.listDepartments({
      includeInactive,
    });

    res.status(200).json({
      success: true,
      message: "Departments retrieved successfully.",
      data: { departments },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/departments/:id
 * @desc    Get a single department by ID
 * @access  Public
 */
export const getDepartmentByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = DepartmentParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: params.error.flatten().fieldErrors,
      });
      return;
    }

    const department = await departmentService.getDepartmentById(
      params.data.id,
    );
    res.status(200).json({
      success: true,
      message: "Department retrieved successfully.",
      data: { department },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/v1/departments
 * @desc    Create a new department
 * @access  Admin
 */
export const createDepartmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = CreateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const department = await departmentService.createDepartment(parsed.data);
    res.status(201).json({
      success: true,
      message: "Department created successfully.",
      data: { department },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/departments/:id
 * @desc    Update an existing department
 * @access  Admin
 */
export const updateDepartmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = DepartmentParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: params.error.flatten().fieldErrors,
      });
      return;
    }

    const parsed = UpdateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const department = await departmentService.updateDepartment(
      params.data.id,
      parsed.data,
    );
    res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: { department },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/departments/:id/status
 * @desc    Activate or deactivate a department
 * @access  Admin
 */
export const setDepartmentStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = DepartmentParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: params.error.flatten().fieldErrors,
      });
      return;
    }

    const parsed = UpdateDepartmentStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const department = await departmentService.setDepartmentStatus(
      params.data.id,
      parsed.data.isActive,
    );
    res.status(200).json({
      success: true,
      message: parsed.data.isActive
        ? "Department activated successfully."
        : "Department deactivated successfully.",
      data: { department },
    });
  } catch (err) {
    next(err);
  }
};

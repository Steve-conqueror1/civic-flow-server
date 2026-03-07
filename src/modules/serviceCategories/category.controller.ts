import { Request, Response, NextFunction } from "express";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  UpdateCategoryStatusSchema,
} from "../../zodschemas/categories";
import * as categoryService from "./category.service";

/**
 * @route   GET /api/v1/categories
 * @desc    List all active service categories
 * @access  Public
 */
export const listCategoriesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const categories = await categoryService.getAllActiveCategories();
    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully.",
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get a single service category by ID
 * @access  Public (inactive categories visible to admins only)
 */
export const getCategoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "super_admin";
    const category = await categoryService.getCategoryById(
      req.params.id as string,
      isAdmin,
    );
    res.status(200).json({
      success: true,
      message: "Category retrieved successfully.",
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/v1/categories
 * @desc    Create a new service category
 * @access  Admin
 */
export const createCategoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = CreateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const category = await categoryService.createCategory(parsed.data);
    res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/categories/:id
 * @desc    Update a service category
 * @access  Admin
 */
export const updateCategoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = UpdateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const category = await categoryService.updateCategory(
      req.params.id as string,
      parsed.data,
    );
    res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/categories/:id/status
 * @desc    Activate or deactivate a service category
 * @access  Admin
 */
export const updateCategoryStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = UpdateCategoryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const category = await categoryService.updateCategoryStatus(
      req.params.id as string,
      parsed.data.isActive,
    );
    res.status(200).json({
      success: true,
      message: `Category ${parsed.data.isActive ? "activated" : "deactivated"} successfully.`,
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

import { Request, Response, NextFunction } from "express";
import {
  UpdateMeSchema,
  AdminUpdateUserSchema,
  ListUsersQuerySchema,
} from "../../zodschemas/users";
import * as usersService from "./users.service";

/**
 * @route   GET /api/v1/users/me
 * @desc    Get the authenticated user's profile
 * @access  Authenticated
 */
export const getMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.getMe(req.user!.sub);
    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully.",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/users/me
 * @desc    Update the authenticated user's profile
 * @access  Authenticated
 */
export const updateMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = UpdateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const user = await usersService.updateMe(req.user!.sub, parsed.data);
    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/v1/users/me
 * @desc    Soft-delete the authenticated user's account
 * @access  Authenticated
 */
export const deleteMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await usersService.deleteMe(req.user!.sub);
    res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/users
 * @desc    List all users (paginated, filterable)
 * @access  Admin, Super Admin
 */
export const listUsersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = ListUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { users, pagination } = await usersService.listUsers(parsed.data);
    res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      data: { users, pagination },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get a user by ID
 * @access  Admin, Super Admin
 */
export const getUserByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.getUserById(req.params.id as string);
    res.status(200).json({
      success: true,
      message: "User retrieved successfully.",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Admin update a user's profile
 * @access  Admin, Super Admin
 */
export const adminUpdateUserHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = AdminUpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const user = await usersService.adminUpdateUser(
      req.user!.sub,
      req.user!.role,
      req.params.id as string,
      parsed.data,
    );
    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/users/:id/deactivate
 * @desc    Toggle user active/inactive status
 * @access  Admin, Super Admin
 */
export const deactivateUserHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.deactivateUser(
      req.user!.sub,
      req.user!.role,
      req.params.id as string,
    );

    const action = user.status === "active" ? "reactivated" : "deactivated";
    res.status(200).json({
      success: true,
      message: `User ${action} successfully.`,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Soft-delete a user account
 * @access  Admin, Super Admin
 */
export const adminDeleteUserHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await usersService.adminDeleteUser(
      req.user!.sub,
      req.user!.role,
      req.params.id as string,
    );
    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
};

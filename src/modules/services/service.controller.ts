import { Request, Response, NextFunction } from "express";
import {
  CreateServiceSchema,
  UpdateServiceSchema,
  ServiceQuerySchema,
  ServiceSearchQuerySchema,
  GroupedQuerySchema,
} from "../../zodschemas/services";
import * as serviceService from "./service.service";

/**
 * @route   GET /api/v1/services
 * @desc    List services (paginated). Admins may pass ?includeInactive=true.
 * @access  Public
 */
export const listServicesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = ServiceQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "super_admin";
    const includeInactive = isAdmin && parsed.data.includeInactive === true;

    const { services, pagination } = await serviceService.listServices({
      page: parsed.data.page,
      limit: parsed.data.limit,
      includeInactive,
    });

    res.status(200).json({
      success: true,
      message: "Services retrieved successfully.",
      data: { services, pagination },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/services/search?q=<term>
 * @desc    Search active services by name or description
 * @access  Public
 */
export const searchServicesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = ServiceSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { services, pagination } = await serviceService.searchServices(
      parsed.data,
    );

    res.status(200).json({
      success: true,
      message: "Search results retrieved successfully.",
      data: { services, pagination },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/services/grouped/category
 * @desc    Return active services grouped by category
 * @access  Public
 */
export const getGroupedByCategoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = GroupedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const groups = await serviceService.getGroupedByCategory(parsed.data.limit);

    res.status(200).json({
      success: true,
      message: "Services grouped by category retrieved successfully.",
      data: {
        groups: groups.map((g) => ({
          category: g.category,
          services: g.services,
          total: g.services.length,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/services/grouped/department
 * @desc    Return active services grouped by department
 * @access  Public
 */
export const getGroupedByDepartmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = GroupedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const groups = await serviceService.getGroupedByDepartment(
      parsed.data.limit,
    );

    res.status(200).json({
      success: true,
      message: "Services grouped by department retrieved successfully.",
      data: {
        groups: groups.map((g) => ({
          department: g.department,
          services: g.services,
          total: g.services.length,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/services/category/:categoryId
 * @desc    List active services for a specific category
 * @access  Public
 */
export const listByCategoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = ServiceQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { services, pagination } = await serviceService.listByCategory({
      categoryId: req.params.categoryId as string,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });

    res.status(200).json({
      success: true,
      message: "Services retrieved successfully.",
      data: { services, pagination },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/services/department/:departmentId
 * @desc    List active services for a specific department
 * @access  Public
 */
export const listByDepartmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = ServiceQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { services, pagination } = await serviceService.listByDepartment({
      departmentId: req.params.departmentId as string,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });

    res.status(200).json({
      success: true,
      message: "Services retrieved successfully.",
      data: { services, pagination },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/services/id/:id
 * @desc    Get a single service by ID
 * @access  Public
 */
export const getServiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const service = await serviceService.getServiceById(
      req.params.id as string,
    );
    res.status(200).json({
      success: true,
      message: "Service retrieved successfully.",
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/services/:slug
 * @desc    Get a single service by slug
 * @access  Public
 */
export const getServiceBySlugHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const service = await serviceService.getServiceBySlug(
      req.params.slug as string,
    );
    res.status(200).json({
      success: true,
      message: "Service retrieved successfully.",
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/v1/services
 * @desc    Create a new service
 * @access  Admin
 */
export const createServiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = CreateServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const service = await serviceService.createService(parsed.data);
    res.status(201).json({
      success: true,
      message: "Service created successfully.",
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/services/:id
 * @desc    Update an existing service
 * @access  Admin
 */
export const updateServiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = UpdateServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const service = await serviceService.updateService(
      req.params.id as string,
      parsed.data,
    );
    res.status(200).json({
      success: true,
      message: "Service updated successfully.",
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/v1/services/:id
 * @desc    Delete a service (blocked if active requests exist)
 * @access  Admin
 */
export const deleteServiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await serviceService.deleteService(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/services/:id/activate
 * @desc    Activate a service
 * @access  Admin
 */
export const activateServiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const service = await serviceService.activateService(
      req.params.id as string,
    );
    res.status(200).json({
      success: true,
      message: "Service activated successfully.",
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/services/:id/deactivate
 * @desc    Deactivate a service
 * @access  Admin
 */
export const deactivateServiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const service = await serviceService.deactivateService(
      req.params.id as string,
    );
    res.status(200).json({
      success: true,
      message: "Service deactivated successfully.",
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};

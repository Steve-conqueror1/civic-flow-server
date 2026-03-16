import { AppError } from "../../shared/errors/AppError";
import * as serviceRepo from "./service.repository";
import type { ServiceRow, ServiceWithRelations } from "./service.repository";
import type { CreateServiceBody, UpdateServiceBody } from "../../zodschemas/services";

type Pagination = { page: number; limit: number; total: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = toSlug(name);
  let slug = base;
  let suffix = 2;

  while (await serviceRepo.findBySlug(slug)) {
    slug = `${base}-${suffix}`;
    suffix++;
  }

  return slug;
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function listServices(opts: {
  page: number;
  limit: number;
  includeInactive?: boolean;
}): Promise<{ services: ServiceRow[]; pagination: Pagination }> {
  const { rows, total } = await serviceRepo.findAll(opts);
  return {
    services: rows,
    pagination: { page: opts.page, limit: opts.limit, total },
  };
}

export async function getServiceById(id: string): Promise<ServiceRow> {
  const service = await serviceRepo.findById(id);
  if (!service) {
    throw new AppError(404, "Service not found.");
  }
  return service;
}

export async function getServiceBySlug(
  slug: string,
): Promise<ServiceWithRelations> {
  const service = await serviceRepo.findBySlugWithRelations(slug);
  if (!service) throw new AppError(404, "Service not found.");
  return service;
}

export async function searchServices(opts: {
  q: string;
  page: number;
  limit: number;
}): Promise<{ services: ServiceRow[]; pagination: Pagination }> {
  const { rows, total } = await serviceRepo.search(opts);
  return {
    services: rows,
    pagination: { page: opts.page, limit: opts.limit, total },
  };
}

export async function listByCategory(opts: {
  categoryId: string;
  page: number;
  limit: number;
}): Promise<{ services: ServiceRow[]; pagination: Pagination }> {
  const exists = await serviceRepo.categoryExists(opts.categoryId);
  if (!exists) {
    throw new AppError(404, "Category not found.");
  }

  const { rows, total } = await serviceRepo.findByCategory(opts);
  return {
    services: rows,
    pagination: { page: opts.page, limit: opts.limit, total },
  };
}

export async function listByDepartment(opts: {
  departmentId: string;
  page: number;
  limit: number;
}): Promise<{ services: ServiceRow[]; pagination: Pagination }> {
  const exists = await serviceRepo.departmentExists(opts.departmentId);
  if (!exists) {
    throw new AppError(404, "Department not found.");
  }

  const { rows, total } = await serviceRepo.findByDepartment(opts);
  return {
    services: rows,
    pagination: { page: opts.page, limit: opts.limit, total },
  };
}

export async function getGroupedByCategory(limitPerGroup: number) {
  return serviceRepo.findGroupedByCategory(limitPerGroup);
}

export async function getGroupedByDepartment(limitPerGroup: number) {
  return serviceRepo.findGroupedByDepartment(limitPerGroup);
}

// ---------------------------------------------------------------------------
// Admin mutations
// ---------------------------------------------------------------------------

export async function createService(
  data: CreateServiceBody,
): Promise<ServiceRow> {
  const existing = await serviceRepo.findByName(data.name, data.departmentId);
  if (existing) {
    throw new AppError(
      409,
      "A service with this name already exists in this department.",
    );
  }

  const slug = await generateUniqueSlug(data.name);
  return serviceRepo.create({ ...data, slug });
}

export async function updateService(
  id: string,
  data: UpdateServiceBody,
): Promise<ServiceRow> {
  const existing = await serviceRepo.findById(id);
  if (!existing) {
    throw new AppError(404, "Service not found.");
  }

  if (data.name && data.name !== existing.name) {
    const departmentId = data.departmentId ?? existing.departmentId;
    const duplicate = await serviceRepo.findByName(data.name, departmentId);
    if (duplicate) {
      throw new AppError(
        409,
        "A service with this name already exists in this department.",
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = await generateUniqueSlug(data.name);
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.instructions !== undefined)
    updateData.instructions = data.instructions;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.departmentId !== undefined)
    updateData.departmentId = data.departmentId;
  if (data.minResponseDays !== undefined)
    updateData.minResponseDays = data.minResponseDays;
  if (data.maxResponseDays !== undefined)
    updateData.maxResponseDays = data.maxResponseDays;

  const updated = await serviceRepo.update(id, updateData);
  return updated!;
}

export async function deleteService(id: string): Promise<void> {
  const existing = await serviceRepo.findById(id);
  if (!existing) {
    throw new AppError(404, "Service not found.");
  }

  const hasActive = await serviceRepo.hasActiveRequests(id);
  if (hasActive) {
    throw new AppError(
      409,
      "Cannot delete a service with active requests.",
    );
  }

  await serviceRepo.remove(id);
}

export async function activateService(id: string): Promise<ServiceRow> {
  const existing = await serviceRepo.findById(id);
  if (!existing) {
    throw new AppError(404, "Service not found.");
  }

  if (existing.isActive) {
    return existing;
  }

  const updated = await serviceRepo.update(id, { isActive: true });
  return updated!;
}

export async function deactivateService(id: string): Promise<ServiceRow> {
  const existing = await serviceRepo.findById(id);
  if (!existing) {
    throw new AppError(404, "Service not found.");
  }

  if (!existing.isActive) {
    return existing;
  }

  const updated = await serviceRepo.update(id, { isActive: false });
  return updated!;
}

import { AppError } from "../../shared/errors/AppError";
import * as departmentRepo from "./department.repository";
import type { DepartmentRow } from "./department.repository";
import type {
  CreateDepartmentBody,
  UpdateDepartmentBody,
} from "../../zodschemas/departments";

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

  while (await departmentRepo.findBySlug(slug)) {
    slug = `${base}-${suffix}`;
    suffix++;
  }

  return slug;
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function listDepartments(opts: {
  includeInactive?: boolean;
}): Promise<DepartmentRow[]> {
  return departmentRepo.findAll(opts);
}

export async function getDepartmentById(id: string): Promise<DepartmentRow> {
  const department = await departmentRepo.findById(id);
  if (!department) {
    throw new AppError(404, "Department not found.");
  }
  return department;
}

// ---------------------------------------------------------------------------
// Admin mutations
// ---------------------------------------------------------------------------

export async function createDepartment(
  data: CreateDepartmentBody,
): Promise<DepartmentRow> {
  const existing = await departmentRepo.findByName(data.name);
  if (existing) {
    throw new AppError(409, "A department with this name already exists.");
  }

  const slug = await generateUniqueSlug(data.name);
  return departmentRepo.create({ ...data, slug });
}

export async function updateDepartment(
  id: string,
  data: UpdateDepartmentBody,
): Promise<DepartmentRow> {
  const existing = await departmentRepo.findById(id);
  if (!existing) {
    throw new AppError(404, "Department not found.");
  }

  if (data.name && data.name !== existing.name) {
    const duplicate = await departmentRepo.findByName(data.name);
    if (duplicate) {
      throw new AppError(409, "A department with this name already exists.");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined && data.name !== existing.name) {
    updateData.name = data.name;
    updateData.slug = await generateUniqueSlug(data.name);
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.icon !== undefined) updateData.icon = data.icon;

  const updated = await departmentRepo.update(id, updateData);
  if (!updated) {
    throw new AppError(404, "Department not found.");
  }
  return updated;
}

export async function setDepartmentStatus(
  id: string,
  isActive: boolean,
): Promise<DepartmentRow> {
  const existing = await departmentRepo.findById(id);
  if (!existing) {
    throw new AppError(404, "Department not found.");
  }

  if (existing.isActive === isActive) {
    return existing;
  }

  const updated = await departmentRepo.update(id, { isActive });
  if (!updated) {
    throw new AppError(404, "Department not found.");
  }
  return updated;
}

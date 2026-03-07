import { AppError } from "../../shared/errors/AppError";
import * as categoryRepo from "./category.repository";
import type { CategoryRow } from "./category.repository";
import type { CreateCategoryBody, UpdateCategoryBody } from "../../zodschemas/categories";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getAllActiveCategories(): Promise<CategoryRow[]> {
  return categoryRepo.findAllActive();
}

export async function getCategoryById(
  id: string,
  isAdmin: boolean,
): Promise<CategoryRow> {
  const category = await categoryRepo.findById(id);
  if (!category) {
    throw new AppError(404, "Category not found.");
  }
  if (!category.isActive && !isAdmin) {
    throw new AppError(404, "Category not found.");
  }
  return category;
}

export async function createCategory(
  data: CreateCategoryBody,
): Promise<CategoryRow> {
  const existing = await categoryRepo.findByName(data.name);
  if (existing) {
    throw new AppError(409, "A category with this name already exists.");
  }

  const slug = toSlug(data.name);
  return categoryRepo.create({
    name: data.name,
    slug,
    description: data.description,
    icon: data.icon,
  });
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryBody,
): Promise<CategoryRow> {
  const category = await categoryRepo.findById(id);
  if (!category) {
    throw new AppError(404, "Category not found.");
  }

  if (data.name && data.name !== category.name) {
    const existing = await categoryRepo.findByName(data.name);
    if (existing) {
      throw new AppError(409, "A category with this name already exists.");
    }
  }

  const updateData: Partial<{ name: string; slug: string; description: string; icon: string }> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = toSlug(data.name);
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.icon !== undefined) updateData.icon = data.icon;

  const updated = await categoryRepo.update(id, updateData);
  return updated!;
}

export async function updateCategoryStatus(
  id: string,
  isActive: boolean,
): Promise<CategoryRow> {
  const category = await categoryRepo.findById(id);
  if (!category) {
    throw new AppError(404, "Category not found.");
  }

  const updated = await categoryRepo.setStatus(id, isActive);
  return updated!;
}

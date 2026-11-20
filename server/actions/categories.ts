"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { fail, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/dal";
import {
  categorySchema,
  categoryUpdateSchema,
  fieldErrors,
} from "@/lib/validations";
import {
  createCategory,
  setCategoryArchived,
  updateCategory,
} from "@/server/data/categories";

/*
 * Каждое действие: проверка сессии → валидация Zod → слой данных (всегда по
 * userId из сессии) → обновление страниц. Данным с клиента не доверяем.
 */

const idSchema = z.object({ id: z.string().regex(/^[a-z0-9]{10,40}$/) });

const UNEXPECTED = "Не удалось сохранить. Попробуйте ещё раз";

async function run<T>(
  task: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const result = await task();
    // Категории видны в операциях, бюджетах и на дашборде — обновляем всё
    if (result.ok) revalidatePath("/", "layout");
    return result;
  } catch (error) {
    console.error("[categories]", error);
    return fail(UNEXPECTED);
  }
}

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }
  return run(() => createCategory(db, user.id, parsed.data));
}

export async function updateCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }
  return run(() => updateCategory(db, user.id, parsed.data));
}

export async function archiveCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail("Категория не найдена");
  return run(() => setCategoryArchived(db, user.id, parsed.data.id, true));
}

export async function restoreCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail("Категория не найдена");
  return run(() => setCategoryArchived(db, user.id, parsed.data.id, false));
}

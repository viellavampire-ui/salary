"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/dal";
import type { BudgetAlert } from "@/lib/notifications";
import { MAX_AMOUNT_MINOR } from "@/lib/money";
import { budgetSchema, fieldErrors } from "@/lib/validations";
import { deleteBudget, upsertBudget } from "@/server/data/budgets";
import { alertsFor } from "@/server/budget-alerts";

/* Проверка сессии → Zod → слой данных (по userId) → обновление страниц. */

const categoryIdSchema = z.string().regex(/^[a-z0-9]{10,40}$/);

/** Данные удалённого бюджета для «Отменить» (сумма уже в копейках). */
const snapshotSchema = z.object({
  categoryId: categoryIdSchema,
  amount: z.number().int().positive().max(MAX_AMOUNT_MINOR),
});

async function run<T>(
  task: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const result = await task();
    if (result.ok) revalidatePath("/", "layout");
    return result;
  } catch (error) {
    console.error("[budgets]", error);
    return fail("Не удалось сохранить. Попробуйте ещё раз");
  }
}

/** Создать или изменить лимит. Сумма приходит строкой из поля ввода. */
export async function upsertBudgetAction(
  input: unknown,
): Promise<ActionResult<{ categoryId: string; alerts: BudgetAlert[] }>> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }
  return run(async () => {
    const result = await upsertBudget(db, user.id, parsed.data);
    if (!result.ok) return result;
    // Новый или уменьшенный лимит может сразу оказаться превышен
    const alerts = await alertsFor(user, [parsed.data.categoryId]);
    return ok({ ...result.data, alerts });
  });
}

export async function deleteBudgetAction(
  input: unknown,
): Promise<ActionResult<{ categoryId: string; amount: number }>> {
  const user = await requireUser();
  const parsed = z.object({ categoryId: categoryIdSchema }).safeParse(input);
  if (!parsed.success) return fail("Бюджет не найден");
  return run(() => deleteBudget(db, user.id, parsed.data.categoryId));
}

export async function restoreBudgetAction(
  input: unknown,
): Promise<ActionResult<{ categoryId: string }>> {
  const user = await requireUser();
  const parsed = snapshotSchema.safeParse(input);
  if (!parsed.success) return fail("Не удалось восстановить бюджет");
  return run(() => upsertBudget(db, user.id, parsed.data));
}

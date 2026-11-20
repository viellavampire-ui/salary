"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/dal";
import type { BudgetAlert } from "@/lib/notifications";
import { toISODate } from "@/lib/period";
import {
  fieldErrors,
  recurringSchema,
  recurringUpdateSchema,
} from "@/lib/validations";
import { alertsFor } from "@/server/budget-alerts";
import {
  createRecurring,
  deleteRecurring,
  setRecurringPaused,
  syncRecurring,
  updateRecurring,
} from "@/server/data/recurring";

/* Проверка сессии → Zod → слой данных (по userId) → синхронизация → страницы. */

const idSchema = z.object({ id: z.string().regex(/^[a-z0-9]{10,40}$/) });

type SyncResult = { created: number; alerts: BudgetAlert[]; currency: string };

type User = Awaited<ReturnType<typeof requireUser>>;

/** Создать наступившие операции и проверить пороги бюджетов. */
async function sync(user: User): Promise<SyncResult> {
  const result = await syncRecurring(db, user.id, toISODate(new Date()));
  const alerts =
    result.expenseCategoryIds.length > 0
      ? await alertsFor(user, result.expenseCategoryIds)
      : [];
  return { created: result.created, alerts, currency: user.currency };
}

async function run<T>(
  task: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const result = await task();
    if (result.ok) revalidatePath("/", "layout");
    return result;
  } catch (error) {
    console.error("[recurring]", error);
    return fail("Не удалось сохранить. Попробуйте ещё раз");
  }
}

export async function createRecurringAction(
  input: unknown,
): Promise<ActionResult<{ id: string } & SyncResult>> {
  const user = await requireUser();
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }
  return run(async () => {
    const result = await createRecurring(db, user.id, parsed.data);
    if (!result.ok) return result;
    // дата начала в прошлом или сегодня — операции появятся сразу
    return ok({ ...result.data, ...(await sync(user)) });
  });
}

export async function updateRecurringAction(
  input: unknown,
): Promise<ActionResult<{ id: string } & SyncResult>> {
  const user = await requireUser();
  const parsed = recurringUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }
  return run(async () => {
    const today = toISODate(new Date());
    const result = await updateRecurring(db, user.id, parsed.data, today);
    if (!result.ok) return result;
    return ok({ ...result.data, ...(await sync(user)) });
  });
}

export async function setRecurringPausedAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = idSchema.extend({ paused: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("Правило не найдено");
  return run(() =>
    setRecurringPaused(
      db,
      user.id,
      parsed.data.id,
      parsed.data.paused,
      toISODate(new Date()),
    ),
  );
}

export async function deleteRecurringAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail("Правило не найдено");
  return run(() => deleteRecurring(db, user.id, parsed.data.id));
}

/**
 * Вызывается при открытии приложения: создаёт операции, дата которых
 * наступила. Страницы обновляются, только если что-то создано.
 */
export async function syncRecurringAction(): Promise<ActionResult<SyncResult>> {
  const user = await requireUser();
  try {
    const result = await sync(user);
    if (result.created > 0) revalidatePath("/", "layout");
    return ok(result);
  } catch (error) {
    console.error("[recurring-sync]", error);
    return fail("Не удалось обновить регулярные операции");
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { fail, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/dal";
import {
  fieldErrors,
  transactionSchema,
  transactionSnapshotSchema,
  transactionUpdateSchema,
  type TransactionSnapshot,
} from "@/lib/validations";
import {
  createTransaction,
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
} from "@/server/data/transactions";

/*
 * Проверка сессии → Zod → слой данных (по userId из сессии) → обновление
 * страниц (дашборд, операции, категории, бюджеты зависят от операций).
 */

const idSchema = z.object({ id: z.string().regex(/^[a-z0-9]{10,40}$/) });

async function run<T>(
  task: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const result = await task();
    if (result.ok) revalidatePath("/", "layout");
    return result;
  } catch (error) {
    console.error("[transactions]", error);
    return fail("Не удалось сохранить. Попробуйте ещё раз");
  }
}

export async function createTransactionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }
  return run(() => createTransaction(db, user.id, parsed.data));
}

export async function updateTransactionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = transactionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }
  return run(() => updateTransaction(db, user.id, parsed.data));
}

export async function deleteTransactionAction(
  input: unknown,
): Promise<ActionResult<TransactionSnapshot>> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail("Операция не найдена");
  return run(() => deleteTransaction(db, user.id, parsed.data.id));
}

export async function restoreTransactionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = transactionSnapshotSchema.safeParse(input);
  if (!parsed.success) return fail("Не удалось восстановить операцию");
  return run(() => restoreTransaction(db, user.id, parsed.data));
}

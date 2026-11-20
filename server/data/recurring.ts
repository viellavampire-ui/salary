/**
 * Регулярные операции. Все запросы — по userId.
 * Без "server-only" — проверяется тестами на базе в памяти.
 */
import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { categories, recurring, transactions } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  dueOccurrences,
  firstIndexOnOrAfter,
  MAX_CATCH_UP,
} from "@/lib/recurring";
import type { ISODate } from "@/lib/period";
import type { RecurringInput, RecurringUpdateInput } from "@/lib/validations";
import { checkCategory } from "./transactions";

async function findOwn(db: Database, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(recurring)
    .where(and(eq(recurring.id, id), eq(recurring.userId, userId)))
    .limit(1);
  return row;
}

/** Правила пользователя с категорией. */
export async function listRecurring(db: Database, userId: string) {
  return db
    .select({
      id: recurring.id,
      type: recurring.type,
      amount: recurring.amount,
      note: recurring.note,
      frequency: recurring.frequency,
      startDate: recurring.startDate,
      endDate: recurring.endDate,
      occurrences: recurring.occurrences,
      isPaused: recurring.isPaused,
      categoryId: recurring.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      categoryArchived: categories.isArchived,
    })
    .from(recurring)
    .innerJoin(categories, eq(categories.id, recurring.categoryId))
    .where(eq(recurring.userId, userId))
    .orderBy(asc(recurring.createdAt));
}

export type RecurringRow = Awaited<ReturnType<typeof listRecurring>>[number];

/**
 * Новое правило. Если дата начала в прошлом, прошедшие повторы будут
 * созданы при ближайшей синхронизации (например, «аренда с сентября»).
 */
export async function createRecurring(
  db: Database,
  userId: string,
  input: RecurringInput,
): Promise<ActionResult<{ id: string }>> {
  const error = await checkCategory(db, userId, input.categoryId, input.type);
  if (error) return error;
  const [row] = await db
    .insert(recurring)
    .values({ ...input, userId, occurrences: 0 })
    .returning({ id: recurring.id });
  return ok({ id: row.id });
}

/**
 * Изменение правила действует только на будущее: уже созданные операции
 * не меняются. Если поменялось расписание (периодичность или дата начала),
 * пропущенные по новому расписанию даты не догоняются — счёт идёт с сегодня.
 */
export async function updateRecurring(
  db: Database,
  userId: string,
  input: RecurringUpdateInput,
  today: ISODate,
): Promise<ActionResult<{ id: string }>> {
  const current = await findOwn(db, userId, input.id);
  if (!current) return fail("Правило не найдено");

  const error = await checkCategory(
    db,
    userId,
    input.categoryId,
    input.type,
    current.categoryId,
  );
  if (error) return error;

  const scheduleChanged =
    current.frequency !== input.frequency ||
    current.startDate !== input.startDate;

  const { id, ...values } = input;
  await db
    .update(recurring)
    .set({
      ...values,
      occurrences: scheduleChanged
        ? firstIndexOnOrAfter(input.startDate, input.frequency, today)
        : current.occurrences,
    })
    .where(and(eq(recurring.id, id), eq(recurring.userId, userId)));
  return ok({ id });
}

/** Пауза и возобновление. После паузы пропущенные даты не догоняются. */
export async function setRecurringPaused(
  db: Database,
  userId: string,
  id: string,
  paused: boolean,
  today: ISODate,
): Promise<ActionResult<{ id: string }>> {
  const current = await findOwn(db, userId, id);
  if (!current) return fail("Правило не найдено");
  if (current.isPaused === paused) return ok({ id });

  await db
    .update(recurring)
    .set({
      isPaused: paused,
      ...(paused
        ? {}
        : {
            occurrences: Math.max(
              current.occurrences,
              firstIndexOnOrAfter(current.startDate, current.frequency, today),
            ),
          }),
    })
    .where(and(eq(recurring.id, id), eq(recurring.userId, userId)));
  return ok({ id });
}

/** Удаление правила; созданные им операции остаются (recurring_id → null). */
export async function deleteRecurring(
  db: Database,
  userId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const [deleted] = await db
    .delete(recurring)
    .where(and(eq(recurring.id, id), eq(recurring.userId, userId)))
    .returning({ id: recurring.id });
  return deleted ? ok({ id }) : fail("Правило не найдено");
}

/**
 * Создаёт операции, дата которых наступила (до today включительно).
 * Повторы невозможны: уникальный индекс (recurring_id, date) + счётчик.
 * Правила архивных категорий пропускаются (и не продвигаются) — после
 * восстановления категории операции догонятся.
 * Возвращает число созданных операций и категории расходов, где они
 * появились (для проверки порогов бюджета).
 */
export async function syncRecurring(
  db: Database,
  userId: string,
  today: ISODate,
  cap = MAX_CATCH_UP,
): Promise<{ created: number; expenseCategoryIds: string[] }> {
  const rules = await listRecurring(db, userId);
  let created = 0;
  const expenseCategories = new Set<string>();

  for (const r of rules) {
    if (r.categoryArchived) continue;
    const due = dueOccurrences(r, today, cap - created);
    if (due.dates.length === 0 && due.occurrences === r.occurrences) continue;

    for (const date of due.dates) {
      const inserted = await db
        .insert(transactions)
        .values({
          userId,
          categoryId: r.categoryId,
          type: r.type,
          amount: r.amount,
          date,
          note: r.note,
          recurringId: r.id,
        })
        .onConflictDoNothing()
        .returning({ id: transactions.id });
      if (inserted.length > 0) {
        created += 1;
        if (r.type === "expense") expenseCategories.add(r.categoryId);
      }
    }
    await db
      .update(recurring)
      .set({ occurrences: due.occurrences })
      .where(and(eq(recurring.id, r.id), eq(recurring.userId, userId)));
    if (created >= cap) break;
  }

  return { created, expenseCategoryIds: [...expenseCategories] };
}

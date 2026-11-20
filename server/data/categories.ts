/**
 * Слой данных категорий. Каждая функция принимает userId первым после db
 * и фильтрует по нему — чужие категории не видны и не изменяются.
 * Без "server-only", чтобы функции можно было проверять тестами на базе
 * в памяти; в приложении их вызывают только server/actions и server/queries.
 */
import { and, asc, count, eq, gte, lte, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { categories, transactions } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import type { CategoryType } from "@/lib/categories";
import type { DateRange } from "@/lib/period";
import type { CategoryInput, CategoryUpdateInput } from "@/lib/validations";

/** Не больше 50 категорий одного типа (вместе с архивными). */
export const MAX_CATEGORIES_PER_TYPE = 50;

const normalize = (name: string) => name.trim().toLocaleLowerCase("ru");

/** Все категории пользователя с суммой и числом операций за период. */
export async function listCategoriesWithTotals(
  db: Database,
  userId: string,
  range: DateRange,
) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      icon: categories.icon,
      color: categories.color,
      isArchived: categories.isArchived,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(
        Number,
      ),
      count: count(transactions.id),
    })
    .from(categories)
    .leftJoin(
      transactions,
      and(
        eq(transactions.categoryId, categories.id),
        eq(transactions.userId, userId),
        gte(transactions.date, range.from),
        lte(transactions.date, range.to),
      ),
    )
    .where(eq(categories.userId, userId))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
}

export type CategoryWithTotals = Awaited<
  ReturnType<typeof listCategoriesWithTotals>
>[number];

async function siblingsOf(db: Database, userId: string, type: CategoryType) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      isArchived: categories.isArchived,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.type, type)));
}

function duplicateError(isArchived: boolean) {
  const message = isArchived
    ? "Такая категория есть в архиве — восстановите её"
    : "Категория с таким названием уже есть";
  return fail<never>(message, { name: [message] });
}

function isUniqueViolation(error: unknown) {
  return String((error as Error)?.message ?? error).includes(
    "UNIQUE constraint failed",
  );
}

async function findOwn(db: Database, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);
  return row;
}

export async function createCategory(
  db: Database,
  userId: string,
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const siblings = await siblingsOf(db, userId, input.type);

  if (siblings.length >= MAX_CATEGORIES_PER_TYPE) {
    return fail(
      `Можно создать не больше ${MAX_CATEGORIES_PER_TYPE} категорий одного типа`,
    );
  }
  const duplicate = siblings.find(
    (c) => normalize(c.name) === normalize(input.name),
  );
  if (duplicate) return duplicateError(duplicate.isArchived);

  const sortOrder = Math.max(-1, ...siblings.map((c) => c.sortOrder)) + 1;

  try {
    const [row] = await db
      .insert(categories)
      .values({ ...input, userId, sortOrder })
      .returning({ id: categories.id });
    return ok({ id: row.id });
  } catch (error) {
    if (isUniqueViolation(error)) return duplicateError(false);
    throw error;
  }
}

export async function updateCategory(
  db: Database,
  userId: string,
  input: CategoryUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  const current = await findOwn(db, userId, input.id);
  if (!current) return fail("Категория не найдена");

  const siblings = await siblingsOf(db, userId, current.type);
  const duplicate = siblings.find(
    (c) => c.id !== input.id && normalize(c.name) === normalize(input.name),
  );
  if (duplicate) return duplicateError(duplicate.isArchived);

  try {
    await db
      .update(categories)
      .set({ name: input.name, icon: input.icon, color: input.color })
      .where(and(eq(categories.id, input.id), eq(categories.userId, userId)));
    return ok({ id: input.id });
  } catch (error) {
    if (isUniqueViolation(error)) return duplicateError(false);
    throw error;
  }
}

/**
 * Архивация вместо удаления: операции категории сохраняются в истории.
 * Последнюю активную категорию типа архивировать нельзя — иначе не получится
 * добавить операцию.
 */
export async function setCategoryArchived(
  db: Database,
  userId: string,
  id: string,
  archived: boolean,
): Promise<ActionResult<{ id: string }>> {
  const current = await findOwn(db, userId, id);
  if (!current) return fail("Категория не найдена");
  if (current.isArchived === archived) return ok({ id });

  if (archived) {
    const siblings = await siblingsOf(db, userId, current.type);
    const activeLeft = siblings.filter((c) => c.id !== id && !c.isArchived);
    if (activeLeft.length === 0) {
      return fail(
        current.type === "expense"
          ? "Нужна хотя бы одна активная категория расходов"
          : "Нужна хотя бы одна активная категория доходов",
      );
    }
  }

  await db
    .update(categories)
    .set({ isArchived: archived })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  return ok({ id });
}

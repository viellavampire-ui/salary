/**
 * Слой данных операций. Каждая функция фильтрует по userId; категория
 * операции обязана принадлежать тому же пользователю и совпадать по типу.
 * Без "server-only" — проверяется тестами на базе в памяти.
 */
import {
  and,
  count,
  desc,
  eq,
  gte,
  like,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { Database } from "@/db";
import { categories, transactions } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import type { CategoryType } from "@/lib/categories";
import type { DateRange } from "@/lib/period";
import type {
  TransactionInput,
  TransactionSnapshot,
  TransactionUpdateInput,
} from "@/lib/validations";

export const PAGE_SIZE = 25;

export type TransactionFilters = {
  type?: CategoryType;
  categoryId?: string;
  q?: string;
};

async function findOwnCategory(db: Database, userId: string, id: string) {
  const [row] = await db
    .select({
      id: categories.id,
      type: categories.type,
      isArchived: categories.isArchived,
    })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);
  return row;
}

async function findOwnTransaction(db: Database, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);
  return row;
}

const categoryError = (message: string) =>
  fail<never>(message, { categoryId: [message] });

/**
 * Проверка категории для операции.
 * allowArchivedId — архивная категория допустима, только если операция уже
 * в ней (редактирование суммы старой операции, восстановление удалённой).
 */
async function checkCategory(
  db: Database,
  userId: string,
  categoryId: string,
  type: CategoryType,
  allowArchivedId?: string,
) {
  const category = await findOwnCategory(db, userId, categoryId);
  if (!category) return categoryError("Выберите категорию");
  if (category.type !== type) {
    return categoryError(
      type === "expense"
        ? "Выберите категорию расходов"
        : "Выберите категорию доходов",
    );
  }
  if (category.isArchived && category.id !== allowArchivedId) {
    return categoryError("Категория в архиве — выберите другую");
  }
  return null;
}

export async function createTransaction(
  db: Database,
  userId: string,
  input: TransactionInput,
): Promise<ActionResult<{ id: string }>> {
  const error = await checkCategory(db, userId, input.categoryId, input.type);
  if (error) return error;

  const [row] = await db
    .insert(transactions)
    .values({ ...input, userId })
    .returning({ id: transactions.id });
  return ok({ id: row.id });
}

export async function updateTransaction(
  db: Database,
  userId: string,
  input: TransactionUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  const current = await findOwnTransaction(db, userId, input.id);
  if (!current) return fail("Операция не найдена");

  const error = await checkCategory(
    db,
    userId,
    input.categoryId,
    input.type,
    current.categoryId,
  );
  if (error) return error;

  const { id, ...values } = input;
  await db
    .update(transactions)
    .set(values)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  return ok({ id });
}

/** Удаляет операцию и возвращает её копию — для кнопки «Отменить». */
export async function deleteTransaction(
  db: Database,
  userId: string,
  id: string,
): Promise<ActionResult<TransactionSnapshot>> {
  const current = await findOwnTransaction(db, userId, id);
  if (!current) return fail("Операция не найдена");

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  return ok({
    id: current.id,
    type: current.type,
    amount: current.amount,
    categoryId: current.categoryId,
    date: current.date,
    note: current.note,
  });
}

/** Возвращает удалённую операцию (данные пришли с клиента — проверяем заново). */
export async function restoreTransaction(
  db: Database,
  userId: string,
  snapshot: TransactionSnapshot,
): Promise<ActionResult<{ id: string }>> {
  const error = await checkCategory(
    db,
    userId,
    snapshot.categoryId,
    snapshot.type,
    snapshot.categoryId,
  );
  if (error) return fail("Не удалось восстановить операцию");

  const [exists] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.id, snapshot.id))
    .limit(1);
  if (exists) return fail("Операция уже восстановлена");

  await db.insert(transactions).values({ ...snapshot, userId });
  return ok({ id: snapshot.id });
}

/* ───────────── Чтение ───────────── */

/** LIKE в SQLite не различает регистр только для латиницы — ищем варианты. */
function searchCondition(q: string): SQL | undefined {
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const variants = new Set([
    escaped,
    escaped.toLocaleLowerCase("ru"),
    escaped.toLocaleUpperCase("ru"),
    escaped.charAt(0).toLocaleUpperCase("ru") +
      escaped.slice(1).toLocaleLowerCase("ru"),
  ]);
  const conditions = [...variants].flatMap((v) => [
    like(transactions.note, `%${v}%`),
    like(categories.name, `%${v}%`),
  ]);
  // ESCAPE нужен, чтобы % и _ в запросе искались как обычные символы
  return or(...conditions.map((c) => sql`${c} escape '\\'`));
}

function whereFor(userId: string, range: DateRange, f: TransactionFilters) {
  return and(
    eq(transactions.userId, userId),
    gte(transactions.date, range.from),
    lte(transactions.date, range.to),
    f.type ? eq(transactions.type, f.type) : undefined,
    f.categoryId ? eq(transactions.categoryId, f.categoryId) : undefined,
    f.q ? searchCondition(f.q) : undefined,
  );
}

/** Операции за период с фильтрами, по 25 на страницу, и суммы по фильтру. */
export async function listTransactions(
  db: Database,
  userId: string,
  range: DateRange,
  filters: TransactionFilters = {},
  page = 1,
) {
  const where = whereFor(userId, range, filters);

  const items = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      note: transactions.note,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(where)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(PAGE_SIZE)
    .offset((Math.max(1, page) - 1) * PAGE_SIZE);

  const [totals] = await db
    .select({
      total: count(),
      income:
        sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} end), 0)`.mapWith(
          Number,
        ),
      expense:
        sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} end), 0)`.mapWith(
          Number,
        ),
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(where);

  return {
    items,
    total: totals.total,
    income: totals.income,
    expense: totals.expense,
    page: Math.max(1, page),
    pageCount: Math.max(1, Math.ceil(totals.total / PAGE_SIZE)),
  };
}

export type TransactionList = Awaited<ReturnType<typeof listTransactions>>;
export type TransactionItem = TransactionList["items"][number];

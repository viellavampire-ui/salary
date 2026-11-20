import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories } from "@/db/schema";
import type { CategoryType } from "@/lib/categories";
import type { DateRange } from "@/lib/period";
import { listCategoriesWithTotals } from "@/server/data/categories";

/**
 * Категории пользователя (по умолчанию только активные).
 * userId всегда берётся из сессии.
 */
export async function getCategories(
  userId: string,
  type?: CategoryType,
  { includeArchived = false }: { includeArchived?: boolean } = {},
) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      icon: categories.icon,
      color: categories.color,
      isArchived: categories.isArchived,
    })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        includeArchived ? undefined : eq(categories.isArchived, false),
        type ? eq(categories.type, type) : undefined,
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/** Все категории (с архивными) и суммы операций за период — для /categories. */
export async function getCategoriesWithTotals(
  userId: string,
  range: DateRange,
) {
  return listCategoriesWithTotals(db, userId, range);
}

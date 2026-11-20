import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories } from "@/db/schema";
import type { CategoryType } from "@/lib/categories";
import type { DateRange } from "@/lib/period";
import { listCategoriesWithTotals } from "@/server/data/categories";

/** Активные категории пользователя. userId всегда берётся из сессии. */
export async function getCategories(userId: string, type?: CategoryType) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      icon: categories.icon,
      color: categories.color,
    })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.isArchived, false),
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

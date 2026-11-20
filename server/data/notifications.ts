/**
 * Уведомления о бюджетах. Все запросы — по userId.
 * Без "server-only" — проверяется тестами на базе в памяти.
 */
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import type { Database } from "@/db";
import { categories, notifications } from "@/db/schema";
import type { BudgetAlert } from "@/lib/notifications";
import { monthKeyForDate, monthPeriod, type ISODate } from "@/lib/period";
import { listBudgetProgress } from "./budgets";

/**
 * Проверяет бюджеты категорий за текущий финансовый месяц и создаёт
 * уведомления о пересечении порогов 80% и 100%. Каждое уведомление —
 * не больше одного раза на бюджет, порог и месяц (уникальный индекс).
 * Возвращает только только что созданные уведомления — для всплывающих
 * сообщений. Вызывать после изменения расходов или лимита.
 */
export async function evaluateBudgetAlerts(
  db: Database,
  userId: string,
  categoryIds: string[],
  today: ISODate,
  monthStartDay = 1,
): Promise<BudgetAlert[]> {
  const ids = new Set(categoryIds);
  if (ids.size === 0) return [];

  const month = monthKeyForDate(today, monthStartDay);
  const progress = (
    await listBudgetProgress(db, userId, monthPeriod(month, monthStartDay))
  ).filter((b) => ids.has(b.categoryId) && b.status !== "ok");

  const created: BudgetAlert[] = [];
  for (const b of progress) {
    const kind = b.status === "over" ? "budget_over" : "budget_warning";
    const [row] = await db
      .insert(notifications)
      .values({
        userId,
        kind,
        categoryId: b.categoryId,
        month,
        spent: b.spent,
        limit: b.limit,
      })
      .onConflictDoNothing()
      .returning({ id: notifications.id });
    if (row) {
      created.push({
        kind,
        categoryId: b.categoryId,
        categoryName: b.name,
        month,
        spent: b.spent,
        limit: b.limit,
      });
    }
  }
  return created;
}

/** Последние уведомления, новые сверху. */
export async function listNotifications(
  db: Database,
  userId: string,
  limit = 20,
) {
  return db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      month: notifications.month,
      spent: notifications.spent,
      limit: notifications.limit,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(notifications)
    .innerJoin(categories, eq(categories.id, notifications.categoryId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export type NotificationItem = Awaited<
  ReturnType<typeof listNotifications>
>[number];

export async function countUnread(db: Database, userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row.n;
}

/** Отметить прочитанными: выбранные (ids) или все непрочитанные. */
export async function markNotificationsRead(
  db: Database,
  userId: string,
  ids?: string[],
) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        ids ? inArray(notifications.id, ids) : undefined,
      ),
    );
}

import "server-only";

import { db } from "@/db";
import type { BudgetAlert } from "@/lib/notifications";
import { toISODate } from "@/lib/period";
import { evaluateBudgetAlerts } from "@/server/data/notifications";

/**
 * После изменения расходов/лимита: проверить пороги бюджета за текущий
 * финансовый месяц и вернуть новые уведомления (для всплывающих сообщений).
 * Сбой проверки не должен ломать само сохранение — поэтому без исключений.
 * Отдельный модуль, а не экспорт из файла "use server": такой экспорт стал
 * бы публичным Server Action.
 */
export async function alertsFor(
  user: { id: string; monthStartDay: number },
  categoryIds: string[],
): Promise<BudgetAlert[]> {
  try {
    return await evaluateBudgetAlerts(
      db,
      user.id,
      categoryIds,
      toISODate(new Date()),
      user.monthStartDay,
    );
  } catch (error) {
    console.error("[budget-alerts]", error);
    return [];
  }
}

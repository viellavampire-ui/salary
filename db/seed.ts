import { DEFAULT_CATEGORIES } from "@/lib/categories";

import type { Database } from "./index";
import { categories } from "./schema";

/**
 * Создаёт стандартный набор категорий для нового пользователя.
 * Повторный вызов безопасен: существующие категории не дублируются.
 */
export async function seedDefaultCategories(
  database: Database,
  userId: string,
) {
  await database
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((c, i) => ({
        userId,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        sortOrder: i,
      })),
    )
    .onConflictDoNothing();
}

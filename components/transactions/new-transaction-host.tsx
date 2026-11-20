import { Suspense } from "react";

import { requireUser } from "@/lib/dal";
import { getCategories } from "@/server/queries/categories";
import { NewTransactionSheet } from "./new-transaction";

/**
 * Панель «Новая операция» для всего приложения. Читает сессию и категории,
 * поэтому стоит в своей границе <Suspense> и не задерживает каркас.
 */
export function NewTransactionHost() {
  return (
    <Suspense fallback={null}>
      <NewTransactionHostInner />
    </Suspense>
  );
}

async function NewTransactionHostInner() {
  const user = await requireUser();
  const categories = await getCategories(user.id);
  return (
    <NewTransactionSheet categories={categories} currency={user.currency} />
  );
}

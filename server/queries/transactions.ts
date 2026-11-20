import "server-only";

import { db } from "@/db";
import type { DateRange } from "@/lib/period";
import {
  listTransactions,
  type TransactionFilters,
} from "@/server/data/transactions";

/** Операции пользователя за период. userId всегда берётся из сессии. */
export async function getTransactions(
  userId: string,
  range: DateRange,
  filters: TransactionFilters,
  page: number,
) {
  return listTransactions(db, userId, range, filters, page);
}

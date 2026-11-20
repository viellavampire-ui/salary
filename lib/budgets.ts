/** Порог «близко к лимиту» (docs/design.md §7.5). */
export const WARNING_RATIO = 0.8;

export type BudgetStatus = "ok" | "warning" | "over";

/** < 80% — в норме, 80–100% — близко к лимиту, > 100% — превышен. */
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (spent > limit) return "over";
  if (spent >= limit * WARNING_RATIO) return "warning";
  return "ok";
}

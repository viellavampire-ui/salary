import type { MonthKey } from "@/lib/period";

export type TrendPoint = {
  month: MonthKey;
  income: number;
  expense: number;
  balance: number;
};

export const SERIES = [
  { key: "income", label: "Доходы", color: "var(--chart-income)", mark: "bar" },
  {
    key: "expense",
    label: "Расходы",
    color: "var(--chart-expense)",
    mark: "bar",
  },
  {
    key: "balance",
    label: "Баланс",
    color: "var(--chart-balance)",
    mark: "line",
  },
] as const;

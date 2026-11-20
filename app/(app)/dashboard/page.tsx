import { Suspense } from "react";
import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";

import { CategoryBarsCard } from "@/components/dashboard/category-bars";
import { IncomeExpenseChart } from "@/components/dashboard/income-expense-chart";
import { KpiCard, Meter } from "@/components/dashboard/kpi-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { EmptyState } from "@/components/layout/empty-state";
import { NewTransactionButton } from "@/components/layout/new-transaction-button";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodPicker } from "@/components/layout/period-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/dal";
import { formatMoney, formatPercent } from "@/lib/money";
import { parsePeriod } from "@/lib/period";
import { cn } from "@/lib/utils";
import { getDashboard } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Дашборд" };

type SearchParams = PageProps<"/dashboard">["searchParams"];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** «к октябрю», «к прошлому периоду» */
function compareLabel(prevLabel: string, kind: string) {
  if (kind !== "month") return "к прошлому периоду";
  const month = prevLabel.split(" ")[0].toLowerCase();
  // ноябрь → ноябрю, май → маю, март → марту
  const dative =
    month.endsWith("ь") || month.endsWith("й")
      ? month.slice(0, -1) + "ю"
      : month + "у";
  return `к ${dative}`;
}

export default function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  return (
    <>
      <PageHeader
        title="Дашборд"
        actions={
          <>
            <PeriodPicker />
            <NewTransactionButton />
          </>
        }
      />
      {/* Сессия и период из URL известны только во время запроса */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const period = parsePeriod(
    { period: one(sp.period), from: one(sp.from), to: one(sp.to) },
    { monthStartDay: user.monthStartDay },
  );
  const data = await getDashboard(user.id, period, user.monthStartDay);
  const { kpis, currency } = { kpis: data.kpis, currency: user.currency };

  if (!data.hasAny) {
    return (
      <EmptyState
        Icon={ChartColumn}
        title="Здесь появится ваша финансовая картина"
        description="Добавьте первый доход или расход — и дашборд покажет баланс, норму сбережений и графики по категориям."
        action={
          <NewTransactionButton variant="inline" label="Добавить операцию" />
        }
      />
    );
  }

  const vs = compareLabel(data.prev.label, period.kind);
  const transactionsHref =
    period.kind === "month"
      ? `/transactions?period=${period.key}`
      : "/transactions";

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        <KpiCard
          label="Доходы"
          value={formatMoney(kpis.income, currency)}
          delta={kpis.incomeDelta}
          goodWhenUp
          compareLabel={vs}
        />
        <KpiCard
          label="Расходы"
          value={formatMoney(kpis.expense, currency)}
          delta={kpis.expenseDelta}
          goodWhenUp={false}
          compareLabel={vs}
        />
        <KpiCard
          label="Баланс"
          value={formatMoney(kpis.balance, currency, { sign: "always" })}
          valueClassName={cn(kpis.balance < 0 && "text-expense")}
          footer={
            <p className="text-xs leading-4 text-muted-foreground">
              {data.prev.label}:{" "}
              <span className="font-medium">
                {formatMoney(kpis.previous.balance, currency, {
                  sign: "always",
                })}
              </span>
            </p>
          }
        />
        <KpiCard
          label="Норма сбережений"
          value={
            kpis.savingsRate === null ? "—" : formatPercent(kpis.savingsRate)
          }
          valueClassName={cn(
            kpis.savingsRate !== null && kpis.savingsRate < 0 && "text-expense",
          )}
          footer={
            kpis.savingsRate === null ? (
              <p className="text-xs leading-4 text-muted-foreground">
                Нет доходов за период
              </p>
            ) : (
              <Meter value={kpis.savingsRate} label="Норма сбережений" />
            )
          }
        />
      </div>

      <IncomeExpenseChart
        data={data.trend}
        currency={currency}
        selected={data.endMonth}
      />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <CategoryBarsCard
          title="Расходы по категориям"
          description={period.label}
          items={data.expenses}
          currency={currency}
          emptyText="Расходов за период нет"
          totalLabel="расходов"
        />
        <CategoryBarsCard
          title="Доходы по источникам"
          description={period.label}
          items={data.incomes}
          currency={currency}
          emptyText="Доходов за период нет"
          totalLabel="доходов"
        />
      </div>

      <RecentTransactions
        items={data.recent}
        currency={currency}
        allHref={transactionsHref}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6" aria-busy>
      <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[392px] rounded-lg" />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}

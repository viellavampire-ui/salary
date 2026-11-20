import { Suspense } from "react";
import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";

import { CategoryComparisonCard } from "@/components/analytics/category-comparison";
import { ExpenseTrendChart, PaceChart } from "@/components/analytics/charts";
import { PeriodControls } from "@/components/analytics/period-controls";
import { CategoryBarsCard } from "@/components/dashboard/category-bars";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/dal";
import { formatMoney } from "@/lib/money";
import { plural } from "@/lib/plural";
import { parsePeriod, periodSearch, toISODate } from "@/lib/period";
import { cn } from "@/lib/utils";
import { getAnalytics } from "@/server/queries/analytics";

export const metadata: Metadata = { title: "Аналитика" };

type SearchParams = PageProps<"/analytics">["searchParams"];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function AnalyticsPage({
  searchParams,
}: PageProps<"/analytics">) {
  return (
    <>
      <PageHeader title="Аналитика" />
      {/* Сессия и период из URL известны только во время запроса */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AnalyticsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = toISODate(new Date());
  const period = parsePeriod(
    { period: one(sp.period), from: one(sp.from), to: one(sp.to) },
    { monthStartDay: user.monthStartDay },
  );
  const data = await getAnalytics(user.id, period, user.monthStartDay, today);
  const currency = user.currency;
  const { kpis } = data;
  const vs = data.compareText ?? "к прошлому периоду";
  // «1–20 окт.» или «Октябрь 2026» — с чем сравниваем
  const prevName = data.compareText
    ? data.compareText.slice(2)
    : data.prev.label;

  // Средний расход в день — по прошедшим дням, если период ещё идёт
  const elapsedDays = data.pace.filter((d) => d.current !== null).length;
  // в целых рублях: копейки в среднем значении — лишняя точность
  const perDay =
    elapsedDays > 0 ? Math.round(kpis.expense / elapsedDays / 100) * 100 : 0;

  const hasData =
    kpis.income > 0 ||
    kpis.expense > 0 ||
    kpis.previous.income > 0 ||
    kpis.previous.expense > 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PeriodControls
        // новый период — новые значения полей «свой период»
        key={period.key}
        period={period}
        monthStartDay={user.monthStartDay}
        today={today}
      />

      {!hasData ? (
        <EmptyState
          Icon={ChartColumn}
          title="Нет операций за этот период"
          description={`${period.label} и ${data.prev.label} — пусто. Выберите другой период или добавьте операции.`}
        />
      ) : (
        <>
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
                  {prevName}:{" "}
                  <span className="font-medium">
                    {formatMoney(kpis.previous.balance, currency, {
                      sign: "always",
                    })}
                  </span>
                </p>
              }
            />
            <KpiCard
              label="Расходы в день"
              value={formatMoney(perDay, currency)}
              footer={
                <p className="text-xs leading-4 text-muted-foreground">
                  В среднем за {elapsedDays}{" "}
                  {plural(elapsedDays, "день", "дня", "дней")}
                  {elapsedDays < data.days ? " (период ещё идёт)" : ""}
                </p>
              }
            />
          </div>

          <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
            <ExpenseTrendChart
              data={data.trend}
              granularity={data.granularity}
              currency={currency}
            />
            <PaceChart
              data={data.pace}
              currency={currency}
              currentLabel={period.label}
              previousLabel={data.prev.label}
            />
          </div>

          <CategoryComparisonCard
            rows={data.comparison}
            currency={currency}
            currentLabel={
              data.compareText ? `${period.label} (по сегодня)` : period.label
            }
            previousLabel={prevName}
          />

          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <CategoryBarsCard
              title="Структура расходов"
              description={period.label}
              items={data.expenses}
              currency={currency}
              emptyText="Расходов за период нет"
              totalLabel="расходов"
            />
            <CategoryBarsCard
              title="Структура доходов"
              description={period.label}
              items={data.incomes}
              currency={currency}
              emptyText="Доходов за период нет"
              totalLabel="доходов"
            />
          </div>

          <RecentTransactions
            title="Топ-5 трат"
            emptyText="Расходов за период нет"
            items={data.top}
            currency={currency}
            allHref={`/transactions?${periodSearch(period)}&type=expense`}
          />
        </>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6" aria-busy>
      <Skeleton className="h-9 w-[30rem] max-w-full" />
      <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
        <Skeleton className="h-[372px] rounded-lg" />
        <Skeleton className="h-[372px] rounded-lg" />
      </div>
    </div>
  );
}

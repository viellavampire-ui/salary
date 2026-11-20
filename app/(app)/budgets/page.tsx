import { Suspense } from "react";
import type { Metadata } from "next";

import { BudgetsView } from "@/components/budgets/budgets-view";
import { PageHeader } from "@/components/layout/page-header";
import { UserPeriodPicker } from "@/components/layout/user-period-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/dal";
import {
  currentMonthKey,
  daysInRange,
  inRange,
  isMonthKey,
  monthPeriod,
  toISODate,
} from "@/lib/period";
import { getBudgetsPage } from "@/server/queries/budgets";

export const metadata: Metadata = { title: "Бюджеты" };

type SearchParams = PageProps<"/budgets">["searchParams"];

export default function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  return (
    <>
      <PageHeader title="Бюджеты" actions={<UserPeriodPicker />} />
      {/* Сессия и месяц из URL известны только во время запроса */}
      <Suspense fallback={<BudgetsSkeleton />}>
        <BudgetsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BudgetsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { period: raw } = await searchParams;
  const today = new Date();

  // Бюджеты месячные — показываем только месяцы
  const key =
    typeof raw === "string" && isMonthKey(raw)
      ? raw
      : currentMonthKey(today, user.monthStartDay);
  const period = monthPeriod(key, user.monthStartDay);
  const todayISO = toISODate(today);
  const daysLeft = inRange(todayISO, period)
    ? daysInRange({ from: todayISO, to: period.to })
    : null;

  const { progress, unbudgeted } = await getBudgetsPage(user.id, period);

  return (
    <BudgetsView
      progress={progress}
      unbudgeted={unbudgeted.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        spent: c.total,
      }))}
      currency={user.currency}
      periodLabel={period.label}
      daysLeft={daysLeft}
    />
  );
}

function BudgetsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-36 rounded-lg" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

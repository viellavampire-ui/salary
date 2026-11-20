import { Suspense } from "react";
import type { Metadata } from "next";

import { NewTransactionButton } from "@/components/layout/new-transaction-button";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodPicker } from "@/components/layout/period-picker";
import { TransactionsView } from "@/components/transactions/transactions-view";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/dal";
import { parsePeriod } from "@/lib/period";
import { transactionFiltersSchema } from "@/lib/validations";
import { PAGE_SIZE } from "@/server/data/transactions";
import { getCategories } from "@/server/queries/categories";
import { getTransactions } from "@/server/queries/transactions";

export const metadata: Metadata = { title: "Операции" };

type SearchParams = PageProps<"/transactions">["searchParams"];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  return (
    <>
      <PageHeader
        title="Операции"
        actions={
          <>
            <PeriodPicker />
            <NewTransactionButton />
          </>
        }
      />
      {/* Сессия и параметры URL известны только во время запроса */}
      <Suspense fallback={<TransactionsSkeleton />}>
        <TransactionsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TransactionsContent({
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
  const filters = transactionFiltersSchema.parse({
    type: one(sp.type),
    category: one(sp.category),
    q: one(sp.q),
    page: one(sp.page),
  });

  const [list, categories] = await Promise.all([
    getTransactions(
      user.id,
      period,
      { type: filters.type, categoryId: filters.category, q: filters.q },
      filters.page ?? 1,
    ),
    getCategories(user.id, undefined, { includeArchived: true }),
  ]);

  return (
    <TransactionsView
      {...list}
      pageSize={PAGE_SIZE}
      categories={categories}
      currency={user.currency}
      periodLabel={period.label}
      filters={{
        type: filters.type,
        categoryId: filters.category,
        q: filters.q,
      }}
      currentYear={Number(period.to.slice(0, 4))}
    />
  );
}

function TransactionsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-3 md:flex-row">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 flex-1" />
      </div>
      <Skeleton className="h-4 w-80" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

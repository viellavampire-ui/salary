import { Suspense } from "react";
import type { Metadata } from "next";

import { CategoriesView } from "@/components/categories/categories-view";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/dal";
import { parsePeriod } from "@/lib/period";
import { getCategoriesWithTotals } from "@/server/queries/categories";

export const metadata: Metadata = { title: "Категории" };

export default function CategoriesPage({
  searchParams,
}: PageProps<"/categories">) {
  return (
    <>
      <PageHeader title="Категории" />
      {/* Сессия и параметры URL известны только во время запроса */}
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CategoriesContent({
  searchParams,
}: {
  searchParams: PageProps<"/categories">["searchParams"];
}) {
  const user = await requireUser();
  const { type } = await searchParams;
  const period = parsePeriod({}, { monthStartDay: user.monthStartDay });
  const categories = await getCategoriesWithTotals(user.id, period);

  const activeType = type === "income" ? "income" : "expense";
  return (
    <CategoriesView
      // смена вкладки (в т.ч. кнопкой «Назад») сбрасывает открытую панель
      key={activeType}
      categories={categories}
      type={activeType}
      currency={user.currency}
      periodLabel={period.label}
    />
  );
}

function CategoriesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

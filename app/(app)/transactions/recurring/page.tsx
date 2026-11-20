import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { RecurringView } from "@/components/recurring/recurring-view";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db";
import { requireUser } from "@/lib/dal";
import { toISODate } from "@/lib/period";
import { listRecurring } from "@/server/data/recurring";
import { getCategories } from "@/server/queries/categories";

export const metadata: Metadata = { title: "Регулярные операции" };

export default function RecurringPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href="/transactions"
          className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" />
          Операции
        </Link>
        <PageHeader
          title="Регулярные операции"
          description="Появляются сами по расписанию — при открытии приложения"
        />
      </div>
      <Suspense fallback={<RecurringSkeleton />}>
        <RecurringContent />
      </Suspense>
    </>
  );
}

async function RecurringContent() {
  const user = await requireUser();
  const [items, categories] = await Promise.all([
    listRecurring(db, user.id),
    getCategories(user.id, undefined, { includeArchived: true }),
  ]);
  return (
    <RecurringView
      items={items}
      categories={categories}
      currency={user.currency}
      today={toISODate(new Date())}
    />
  );
}

function RecurringSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

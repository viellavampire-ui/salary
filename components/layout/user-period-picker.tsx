import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/dal";
import { PeriodPicker } from "./period-picker";

/**
 * Выбор месяца с учётом дня начала финансового месяца пользователя.
 * Читает сессию, поэтому в своей границе <Suspense>.
 */
export function UserPeriodPicker() {
  return (
    <Suspense fallback={<Skeleton className="h-9 w-56" />}>
      <Inner />
    </Suspense>
  );
}

async function Inner() {
  const { monthStartDay } = await requireUser();
  return <PeriodPicker monthStartDay={monthStartDay} />;
}

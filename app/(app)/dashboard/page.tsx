import type { Metadata } from "next";
import Link from "next/link";
import { ChartColumn } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { NEW_TRANSACTION_HREF } from "@/components/layout/nav-items";
import { NewTransactionButton } from "@/components/layout/new-transaction-button";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodPicker } from "@/components/layout/period-picker";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Дашборд" };

/** KPI и графики появятся на шаге 10. */
export default function DashboardPage() {
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
      <EmptyState
        Icon={ChartColumn}
        title="Здесь появится ваша финансовая картина"
        description="Доходы, расходы, баланс и графики по категориям — после первых операций."
        action={
          <Button asChild>
            <Link href={NEW_TRANSACTION_HREF}>Добавить операцию</Link>
          </Button>
        }
      />
    </>
  );
}

import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { NewTransactionButton } from "@/components/layout/new-transaction-button";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodPicker } from "@/components/layout/period-picker";

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
          <NewTransactionButton variant="inline" label="Добавить операцию" />
        }
      />
    </>
  );
}

import type { Metadata } from "next";
import { PiggyBank } from "lucide-react";

import { PeriodPicker } from "@/components/layout/period-picker";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Бюджеты" };

export default function BudgetsPage() {
  return (
    <PlaceholderPage
      title="Бюджеты"
      Icon={PiggyBank}
      step={11}
      description="Месячные лимиты по категориям и прогресс трат."
      actions={<PeriodPicker />}
    />
  );
}

import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";

import { NewTransactionButton } from "@/components/layout/new-transaction-button";
import { PeriodPicker } from "@/components/layout/period-picker";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Операции" };

export default function TransactionsPage() {
  return (
    <PlaceholderPage
      title="Операции"
      Icon={ArrowLeftRight}
      step={9}
      description="Список доходов и расходов с фильтрами и поиском."
      actions={
        <>
          <PeriodPicker />
          <NewTransactionButton />
        </>
      }
    />
  );
}

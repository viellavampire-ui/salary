import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Аналитика" };

export default function AnalyticsPage() {
  return (
    <PlaceholderPage
      title="Аналитика"
      Icon={ChartColumn}
      step={12}
      description="Тренды, структура расходов и доходов за любой период."
    />
  );
}

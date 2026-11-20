"use client";

import dynamic from "next/dynamic";

import { WhenVisible } from "@/components/charts/when-visible";
import { Skeleton } from "@/components/ui/skeleton";

export type { PacePoint, TrendPoint } from "./charts-impl";

/** Заглушка карточки графика того же размера, пока грузится Recharts. */
function CardPlaceholder() {
  return <Skeleton className="h-[372px] rounded-lg" />;
}

// Recharts (~130 КБ) грузится отдельно и не задерживает первую отрисовку,
// а рисуется, только когда карточка приблизилась к экрану
const ExpenseTrendChartLazy = dynamic(
  () => import("./charts-impl").then((m) => m.ExpenseTrendChart),
  { ssr: false, loading: CardPlaceholder },
);

const PaceChartLazy = dynamic(
  () => import("./charts-impl").then((m) => m.PaceChart),
  { ssr: false, loading: CardPlaceholder },
);

export function ExpenseTrendChart(
  props: React.ComponentProps<typeof ExpenseTrendChartLazy>,
) {
  return (
    <WhenVisible placeholder={<CardPlaceholder />}>
      <ExpenseTrendChartLazy {...props} />
    </WhenVisible>
  );
}

export function PaceChart(props: React.ComponentProps<typeof PaceChartLazy>) {
  return (
    <WhenVisible placeholder={<CardPlaceholder />}>
      <PaceChartLazy {...props} />
    </WhenVisible>
  );
}

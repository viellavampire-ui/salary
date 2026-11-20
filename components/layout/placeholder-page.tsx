import type { LucideIcon } from "lucide-react";

import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

/** Заготовка раздела, который будет реализован на одном из следующих шагов. */
export function PlaceholderPage({
  title,
  Icon,
  step,
  description,
  actions,
}: {
  title: string;
  Icon: LucideIcon;
  step: number;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} actions={actions} />
      <EmptyState
        Icon={Icon}
        title="Раздел в разработке"
        description={`${description} Появится на шаге ${step} плана.`}
      />
    </>
  );
}

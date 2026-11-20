import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Пустое состояние (docs/design.md §11): иконка 48px, заголовок, пояснение, кнопка. */
export function EmptyState({
  Icon,
  title,
  description,
  action,
  className,
}: {
  Icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <Icon
        className="size-12 text-muted-foreground"
        strokeWidth={1.25}
        aria-hidden
      />
      <h2 className="text-lg leading-7 font-semibold">{title}</h2>
      {description && (
        <p className="max-w-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

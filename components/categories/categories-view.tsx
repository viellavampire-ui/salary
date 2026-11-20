"use client";

import { useLayoutEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArchiveRestore, ChevronDown, Plus, Tags } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_TYPE_LABELS,
  type CategoryColor,
  type CategoryType,
} from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { restoreCategoryAction } from "@/server/actions/categories";
import { CategoryIcon } from "./category-icon";
import { CategorySheet, type SheetState } from "./category-sheet";

export type CategoryRow = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: CategoryColor;
  isArchived: boolean;
  total: number;
  count: number;
};

function operationsWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "операция";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return "операции";
  return "операций";
}

export function CategoriesView({
  categories,
  type,
  currency,
  periodLabel,
}: {
  categories: CategoryRow[];
  type: CategoryType;
  currency: string;
  periodLabel: string;
}) {
  const [sheet, setSheet] = useState<SheetState>(null);

  // Next.js скрывает страницу через <Activity> при уходе — закрываем панель,
  // чтобы при возвращении она не оказалась открытой
  useLayoutEffect(() => () => setSheet(null), []);

  const active = categories.filter((c) => c.type === type && !c.isArchived);
  const archived = categories.filter((c) => c.type === type && c.isArchived);
  const total = active.reduce((sum, c) => sum + c.total, 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Тип категорий"
          className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-surface p-0.5"
        >
          {(["expense", "income"] as const).map((t) => (
            <Link
              key={t}
              href={t === "expense" ? "/categories" : "/categories?type=income"}
              scroll={false}
              aria-current={t === type ? "page" : undefined}
              className={cn(
                "inline-flex h-full items-center rounded-sm px-4 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                t === type && "bg-background text-foreground shadow-sm",
              )}
            >
              {CATEGORY_TYPE_LABELS[t]}
            </Link>
          ))}
        </nav>
        <Button onClick={() => setSheet({ mode: "create", type })}>
          <Plus />
          Новая категория
        </Button>
      </div>

      <p className="-mt-2 text-sm text-muted-foreground">
        {periodLabel}:{" "}
        <span className="font-medium text-foreground tabular-nums">
          {formatMoney(total, currency)}
        </span>{" "}
        в {active.length} {active.length === 1 ? "категории" : "категориях"}
      </p>

      {active.length === 0 ? (
        <EmptyState
          Icon={Tags}
          title="Нет активных категорий"
          description="Создайте категорию, чтобы добавлять операции."
          action={
            <Button onClick={() => setSheet({ mode: "create", type })}>
              <Plus />
              Новая категория
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {active.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSheet({ mode: "edit", category: c })}
                className="flex w-full items-center gap-3 rounded-lg border bg-surface p-4 text-left transition-colors duration-150 outline-none hover:border-primary/40 hover:bg-primary-soft/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <CategoryIcon icon={c.icon} color={c.color} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.count > 0
                      ? `${c.count} ${operationsWord(c.count)}`
                      : "Нет операций"}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 font-medium tabular-nums",
                    c.total === 0 && "text-muted-foreground",
                  )}
                >
                  {formatMoney(c.total, currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && <ArchivedList items={archived} />}

      <CategorySheet state={sheet} onClose={() => setSheet(null)} />
    </>
  );
}

function ArchivedList({ items }: { items: CategoryRow[] }) {
  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-150 group-open:rotate-180" />
        Архив
        <span className="text-muted-foreground">({items.length})</span>
      </summary>
      <ul className="flex flex-col border-t">
        {items.map((c) => (
          <ArchivedItem key={c.id} category={c} />
        ))}
      </ul>
    </details>
  );
}

function ArchivedItem({ category }: { category: CategoryRow }) {
  const [pending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      const result = await restoreCategoryAction({ id: category.id });
      if (result.ok) toast.success(`«${category.name}» восстановлена`);
      else toast.error(result.error);
    });
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 not-last:border-b">
      <CategoryIcon
        icon={category.icon}
        color={category.color}
        className="opacity-60"
      />
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {category.name}
      </span>
      <Button variant="ghost" size="sm" onClick={restore} disabled={pending}>
        <ArchiveRestore />
        Восстановить
      </Button>
    </li>
  );
}

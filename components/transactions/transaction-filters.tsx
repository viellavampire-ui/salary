"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryType } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { FormCategory } from "./types";

/** Обновляет параметры URL (сбрасывая страницу), не прокручивая наверх. */
function useUpdateParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  return { update, pending };
}

const TYPES: { value?: CategoryType; label: string }[] = [
  { label: "Все" },
  { value: "expense", label: "Расходы" },
  { value: "income", label: "Доходы" },
];

/** Фильтры списка операций; всё состояние — в URL. */
export function TransactionFilters({
  type,
  categoryId,
  q,
  categories,
}: {
  type?: CategoryType;
  categoryId?: string;
  q?: string;
  categories: FormCategory[];
}) {
  const { update, pending } = useUpdateParams();
  const [search, setSearch] = useState(q ?? "");
  const first = useRef(true);

  // Поиск с задержкой 300 мс, чтобы не дёргать сервер на каждую букву
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(
      () => update({ q: search.trim() || undefined }),
      300,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- реагируем только на ввод
  }, [search]);

  const visibleCategories = categories.filter((c) => !type || c.type === type);
  const hasFilters = Boolean(type || categoryId || q);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div
        role="group"
        aria-label="Тип операций"
        className="inline-flex h-9 shrink-0 items-center gap-0.5 self-start rounded-md border bg-surface p-0.5"
      >
        {TYPES.map((t) => (
          <button
            key={t.label}
            type="button"
            aria-pressed={type === t.value}
            onClick={() => {
              const keepCategory = categories.find((c) => c.id === categoryId);
              update({
                type: t.value,
                category:
                  t.value && keepCategory?.type !== t.value
                    ? undefined
                    : categoryId,
              });
            }}
            className={cn(
              "inline-flex h-full items-center rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
              type === t.value && "bg-background text-foreground shadow-sm",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="tx-filter-category">
        Категория
      </label>
      <select
        id="tx-filter-category"
        value={categoryId ?? ""}
        onChange={(e) => update({ category: e.target.value || undefined })}
        className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-56"
      >
        <option value="">Все категории</option>
        {(["expense", "income"] as const).map((t) => {
          const group = visibleCategories.filter((c) => c.type === t);
          if (group.length === 0) return null;
          return (
            <optgroup key={t} label={t === "expense" ? "Расходы" : "Доходы"}>
              {group.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isArchived ? " (архив)" : ""}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Поиск по комментарию и категории"
          placeholder="Поиск по операциям"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9 pl-9"
        />
        {pending && (
          <LoaderCircle
            aria-hidden
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          onClick={() => {
            setSearch("");
            update({ type: undefined, category: undefined, q: undefined });
          }}
          className="self-start"
        >
          <X />
          Сбросить
        </Button>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { UseFormRegisterReturn } from "react-hook-form";

import type { CategoryColor } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

/**
 * Выбор категории иконками (нативные radio — стрелки и Tab работают сами).
 * Используется в формах операции и регулярного платежа.
 */
export function CategoryRadioGrid({
  options,
  registration,
  error,
}: {
  options: { id: string; name: string; icon: string; color: CategoryColor }[];
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <fieldset aria-invalid={Boolean(error)}>
      <legend className="mb-2 text-sm font-medium">Категория</legend>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Нет активных категорий этого типа.{" "}
          <Link
            href="/categories"
            className="text-primary underline-offset-4 hover:underline"
          >
            Создать категорию
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {options.map((c) => (
            <label key={c.id} className="relative">
              <input
                type="radio"
                value={c.id}
                className="peer sr-only"
                {...registration}
              />
              <span
                className={cn(
                  "flex h-full cursor-pointer flex-col items-center gap-1.5 rounded-md border border-transparent p-2 text-center text-xs leading-4 transition-colors duration-150 hover:bg-surface",
                  "peer-checked:border-primary peer-checked:bg-primary-soft peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                )}
              >
                <CategoryIcon icon={c.icon} color={c.color} />
                <span className="line-clamp-2 break-words">{c.name}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs leading-4 text-expense">{error}</p>}
    </fieldset>
  );
}

"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

import {
  CATEGORY_COLORS,
  CATEGORY_COLOR_LABELS,
  CATEGORY_ICONS,
  CATEGORY_ICON_LABELS,
  CATEGORY_ICON_NAMES,
  type CategoryColor,
} from "@/lib/categories";
import { cn } from "@/lib/utils";

/*
 * Выбор иконки и цвета на нативных radio: стрелки клавиатуры, Tab и
 * программы чтения экрана работают без дополнительного кода.
 */

const optionRing =
  "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 peer-checked:ring-2 peer-checked:ring-primary";

export function IconPicker({
  registration,
  color,
  value,
  invalid,
}: {
  registration: UseFormRegisterReturn;
  color: CategoryColor;
  value: string;
  invalid?: boolean;
}) {
  return (
    <fieldset aria-invalid={invalid}>
      <legend className="mb-2 text-sm font-medium">Иконка</legend>
      <div className="grid grid-cols-8 gap-1.5">
        {CATEGORY_ICON_NAMES.map((name) => {
          const Icon = CATEGORY_ICONS[name];
          const checked = value === name;
          return (
            <label
              key={name}
              title={CATEGORY_ICON_LABELS[name]}
              className="relative"
            >
              <input
                type="radio"
                value={name}
                className="peer sr-only"
                {...registration}
              />
              <span
                className={cn(
                  "flex aspect-square cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-surface hover:text-foreground",
                  optionRing,
                )}
                style={
                  checked
                    ? {
                        color: `var(--cat-${color})`,
                        backgroundColor: `color-mix(in oklab, var(--cat-${color}) 15%, transparent)`,
                      }
                    : undefined
                }
              >
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                <span className="sr-only">{CATEGORY_ICON_LABELS[name]}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ColorPicker({
  registration,
  invalid,
}: {
  registration: UseFormRegisterReturn;
  invalid?: boolean;
}) {
  return (
    <fieldset aria-invalid={invalid}>
      <legend className="mb-2 text-sm font-medium">Цвет</legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((c) => (
          <label key={c} title={CATEGORY_COLOR_LABELS[c]} className="relative">
            <input
              type="radio"
              value={c}
              className="peer sr-only"
              {...registration}
            />
            <span
              className={cn(
                "block size-8 cursor-pointer rounded-full ring-offset-2 ring-offset-background transition-shadow duration-150",
                optionRing,
              )}
              style={{ backgroundColor: `var(--cat-${c})` }}
            >
              <span className="sr-only">{CATEGORY_COLOR_LABELS[c]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

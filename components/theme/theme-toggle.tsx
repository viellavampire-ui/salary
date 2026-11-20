"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "./use-theme";

export const THEME_OPTIONS: {
  value: Theme;
  label: string;
  short: string;
  Icon: typeof Sun;
}[] = [
  { value: "light", label: "Светлая тема", short: "Светлая", Icon: Sun },
  { value: "dark", label: "Тёмная тема", short: "Тёмная", Icon: Moon },
  {
    value: "system",
    label: "Как в системе",
    short: "Системная",
    Icon: Monitor,
  },
];

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();

  return (
    <div
      role="group"
      aria-label="Тема оформления"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border bg-surface p-0.5",
        className,
      )}
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
            theme === value && "bg-background text-foreground shadow-sm",
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}

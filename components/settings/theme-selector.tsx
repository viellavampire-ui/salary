"use client";

import { THEME_OPTIONS } from "@/components/theme/theme-toggle";
import { useTheme } from "@/components/theme/use-theme";
import { cn } from "@/lib/utils";

/** Выбор темы крупными карточками (то же, что в меню профиля). */
export function ThemeSelector() {
  const [theme, setTheme] = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Тема оформления"
      className="grid grid-cols-3 gap-2 sm:max-w-md"
    >
      {THEME_OPTIONS.map(({ value, short, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-md border bg-background px-3 py-3 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
            theme === value &&
              "border-primary bg-primary-soft text-primary hover:text-primary",
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
          {short}
        </button>
      ))}
    </div>
  );
}

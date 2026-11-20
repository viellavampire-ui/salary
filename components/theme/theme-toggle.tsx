"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY } from "./theme-script";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Светлая тема", Icon: Sun },
  { value: "dark", label: "Тёмная тема", Icon: Moon },
  { value: "system", label: "Как в системе", Icon: Monitor },
];

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && media().matches);
  document.documentElement.classList.toggle("dark", dark);
}

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  // null до монтирования: на сервере выбор пользователя неизвестен
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- значение доступно только в браузере
    setTheme(readTheme());
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = media();
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function select(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // приватный режим — тема просто не запомнится
    }
    applyTheme(next);
  }

  return (
    <div
      role="group"
      aria-label="Тема оформления"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border bg-surface p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => select(value)}
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

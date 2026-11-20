"use client";

import { useCallback, useEffect, useState } from "react";

import { THEME_STORAGE_KEY } from "./theme-script";

export type Theme = "light" | "dark" | "system";

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

const listeners = new Set<(t: Theme) => void>();

/**
 * Выбранная тема (light/dark/system). До монтирования — null:
 * на сервере выбор пользователя неизвестен.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- значение доступно только в браузере
    setThemeState(readTheme());
    listeners.add(setThemeState);
    return () => {
      listeners.delete(setThemeState);
    };
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = media();
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // приватный режим — тема просто не запомнится
    }
    applyTheme(next);
    // синхронизируем все переключатели на странице
    listeners.forEach((l) => l(next));
  }, []);

  return [theme, setTheme] as const;
}

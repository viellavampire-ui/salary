"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck, CircleAlert, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NotificationKind } from "@/db/schema";
import { alertDescription, alertTitle } from "@/lib/notifications";
import { formatDate } from "@/lib/period";
import { plural } from "@/lib/plural";
import { cn } from "@/lib/utils";
import { markNotificationsReadAction } from "@/server/actions/notifications";

export type BellItem = {
  id: string;
  kind: NotificationKind;
  month: string;
  spent: number;
  limit: number;
  read: boolean;
  /** Дата создания YYYY-MM-DD (с сервера — одинаково при SSR и в браузере) */
  date: string;
  categoryName: string;
};

/**
 * Колокольчик уведомлений: счётчик непрочитанных и список последних.
 * variant="sidebar" — строка в боковом меню (на планшете только иконка),
 * variant="compact" — иконка в шапке на телефоне.
 */
export function NotificationBell({
  items,
  unread,
  currency,
  variant,
}: {
  items: BellItem[];
  unread: number;
  currency: string;
  variant: "sidebar" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const unreadText =
    unread > 0
      ? `${unread} ${plural(unread, "непрочитанное", "непрочитанных", "непрочитанных")}`
      : "нет непрочитанных";

  function markRead(ids?: string[]) {
    startTransition(async () => {
      await markNotificationsReadAction({ ids });
    });
  }

  const badge =
    unread > 0 ? (
      <span
        aria-hidden
        className={cn(
          "inline-flex min-w-5 items-center justify-center rounded-full bg-expense px-1 text-[11px] leading-5 font-semibold text-white tabular-nums dark:text-background",
          variant === "compact" && "absolute -top-1 -right-1",
          variant === "sidebar" &&
            "absolute -top-1 right-1 lg:static lg:ml-auto",
        )}
      >
        {unread > 99 ? "99+" : unread}
      </span>
    ) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "relative inline-flex items-center rounded-md text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
          variant === "sidebar" &&
            "h-10 w-full justify-center gap-3 px-3 text-sm font-medium hover:bg-surface lg:justify-start",
          variant === "compact" && "size-9 justify-center hover:bg-surface",
          open && "text-foreground",
        )}
      >
        <Bell className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        {/* Видимый текст входит в доступное имя (WCAG 2.5.3) */}
        <span
          className={cn(
            variant === "sidebar" ? "sr-only lg:not-sr-only" : "sr-only",
          )}
        >
          Уведомления
        </span>
        <span className="sr-only">: {unreadText}</span>
        {badge}
      </PopoverTrigger>

      <PopoverContent
        align={variant === "sidebar" ? "start" : "end"}
        side={variant === "sidebar" ? "right" : "bottom"}
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Уведомления</h2>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markRead()}
              disabled={pending}
            >
              <CheckCheck />
              Отметить все
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Пока уведомлений нет. Здесь появятся предупреждения, когда траты
            подойдут к лимиту бюджета.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const Icon =
                n.kind === "budget_over" ? CircleAlert : TriangleAlert;
              return (
                <li key={n.id} className="not-last:border-b">
                  <Link
                    href={`/budgets?period=${n.month}`}
                    onClick={() => {
                      if (!n.read) markRead([n.id]);
                      setOpen(false);
                    }}
                    className="flex gap-3 px-4 py-3 outline-none hover:bg-surface focus-visible:bg-surface"
                  >
                    <Icon
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        n.kind === "budget_over"
                          ? "text-expense"
                          : "text-warning",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm",
                          n.read ? "text-muted-foreground" : "font-semibold",
                        )}
                      >
                        {n.read ? "" : <span className="sr-only">Новое: </span>}
                        {alertTitle(n)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {alertDescription(n, currency)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(n.date)}
                      </span>
                    </span>
                    {!n.read && (
                      <span
                        aria-hidden
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { MOBILE_NAV_ITEMS, NEW_TRANSACTION_HREF, isActive } from "./nav-items";

/** Нижняя панель навигации на телефоне (< 768px) с кнопкой «+» по центру. */
export function MobileNav() {
  const pathname = usePathname();
  const left = MOBILE_NAV_ITEMS.slice(0, 2);
  const right = MOBILE_NAV_ITEMS.slice(2);

  const item = ({ href, label, Icon }: (typeof MOBILE_NAV_ITEMS)[number]) => {
    const active = isActive(pathname, href);
    return (
      <li key={href} className="flex-1">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-14 flex-col items-center justify-center gap-1 text-[11px] leading-none font-medium text-muted-foreground outline-none focus-visible:bg-surface",
            active && "text-primary",
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
          {label}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Основное меню"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex items-center">
        {left.map(item)}
        <li className="flex flex-1 justify-center">
          <Link
            href={NEW_TRANSACTION_HREF}
            aria-label="Добавить операцию"
            className="-mt-5 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-popover ring-4 ring-background transition-colors duration-150 outline-none hover:bg-primary/90 focus-visible:ring-ring/50"
          >
            <Plus className="size-6" strokeWidth={2} />
          </Link>
        </li>
        {right.map(item)}
      </ul>
    </nav>
  );
}

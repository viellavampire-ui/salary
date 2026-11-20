"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

/**
 * Пункты сайдбара. На планшете (md) видны только иконки с подсказками,
 * на десктопе (lg) — иконка и подпись.
 */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Основное меню">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:bg-surface hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      "justify-center lg:justify-start",
                      active &&
                        "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-primary lg:-left-4"
                      />
                    )}
                    <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                    <span className="sr-only lg:not-sr-only">{label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden">
                  {label}
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

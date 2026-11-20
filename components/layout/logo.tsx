import Link from "next/link";
import { PiggyBank } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Логотип. compact — на планшете (сайдбар 72px) прячет название.
 */
export function Logo({
  href = "/",
  compact = false,
}: {
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Salary — на главную"
      className="inline-flex items-center gap-2 rounded-md text-base font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <PiggyBank className="size-5" strokeWidth={1.75} />
      </span>
      <span className={cn(compact && "hidden lg:inline")}>Salary</span>
    </Link>
  );
}

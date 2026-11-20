import Link from "next/link";
import { PiggyBank } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md text-base font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <PiggyBank className="size-5" strokeWidth={1.75} />
      </span>
      Salary
    </Link>
  );
}

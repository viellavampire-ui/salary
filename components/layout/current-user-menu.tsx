import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/dal";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

/**
 * Меню профиля с данными из сессии. Чтение сессии — только внутри
 * <Suspense>, чтобы остальной каркас пререндерился (cacheComponents).
 */
export function CurrentUserMenu({
  variant,
}: {
  variant: "sidebar" | "compact";
}) {
  return (
    <Suspense fallback={<UserMenuSkeleton variant={variant} />}>
      <CurrentUserMenuInner variant={variant} />
    </Suspense>
  );
}

async function CurrentUserMenuInner({
  variant,
}: {
  variant: "sidebar" | "compact";
}) {
  const { name, email, image } = await requireUser();
  return <UserMenu user={{ name, email, image }} variant={variant} />;
}

function UserMenuSkeleton({ variant }: { variant: "sidebar" | "compact" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center gap-3",
        variant === "sidebar" && "justify-center p-2 lg:justify-start",
        variant === "compact" && "p-0.5",
      )}
    >
      <Skeleton className="size-8 rounded-full" />
      {variant === "sidebar" && (
        <div className="hidden flex-1 flex-col gap-1.5 lg:flex">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      )}
    </div>
  );
}

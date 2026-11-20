import { Suspense } from "react";

import { db } from "@/db";
import { requireUser } from "@/lib/dal";
import { toISODate } from "@/lib/period";
import { countUnread, listNotifications } from "@/server/data/notifications";
import { NotificationBell } from "./notification-bell";

/**
 * Колокольчик с данными пользователя. Читает сессию — в своей границе
 * <Suspense>, чтобы каркас приложения пререндерился.
 */
export function CurrentNotifications({
  variant,
}: {
  variant: "sidebar" | "compact";
}) {
  return (
    <Suspense
      fallback={
        <span
          aria-hidden
          className={variant === "sidebar" ? "block h-10" : "block size-9"}
        />
      }
    >
      <Inner variant={variant} />
    </Suspense>
  );
}

async function Inner({ variant }: { variant: "sidebar" | "compact" }) {
  const user = await requireUser();
  const [items, unread] = await Promise.all([
    listNotifications(db, user.id, 20),
    countUnread(db, user.id),
  ]);
  return (
    <NotificationBell
      variant={variant}
      unread={unread}
      currency={user.currency}
      items={items.map((n) => ({
        id: n.id,
        kind: n.kind,
        month: n.month,
        spent: n.spent,
        limit: n.limit,
        read: n.readAt !== null,
        date: toISODate(n.createdAt),
        categoryName: n.categoryName,
      }))}
    />
  );
}

import { CurrentNotifications } from "@/components/notifications/current-notifications";
import { CurrentUserMenu } from "./current-user-menu";
import { Logo } from "./logo";

/** Шапка на телефоне: логотип и аватар с меню профиля. */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <Logo href="/dashboard" />
      <div className="flex items-center gap-1">
        <CurrentNotifications variant="compact" />
        <CurrentUserMenu variant="compact" />
      </div>
    </header>
  );
}

import { CurrentUserMenu } from "./current-user-menu";
import { Logo } from "./logo";

/** Шапка на телефоне: логотип и аватар с меню профиля. */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <Logo href="/dashboard" />
      <CurrentUserMenu variant="compact" />
    </header>
  );
}

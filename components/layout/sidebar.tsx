import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrentUserMenu } from "./current-user-menu";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";

/**
 * Боковое меню: 72px на планшете (только иконки), 248px на десктопе.
 * На телефоне скрыто — вместо него MobileHeader + MobileNav.
 */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col border-r bg-surface md:flex lg:w-[248px]">
      <div className="flex h-16 items-center justify-center px-4 lg:justify-start">
        <Logo href="/dashboard" compact />
      </div>
      <TooltipProvider>
        <div className="flex-1 overflow-y-auto px-3 py-2 lg:px-4">
          <SidebarNav />
        </div>
      </TooltipProvider>
      <div className="border-t p-3 lg:p-4">
        <CurrentUserMenu variant="sidebar" />
      </div>
    </aside>
  );
}

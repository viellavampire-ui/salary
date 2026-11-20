import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { NewTransactionHost } from "@/components/transactions/new-transaction-host";

/**
 * Каркас приложения (docs/design.md §5–6): сайдбар на планшете/десктопе,
 * шапка + нижняя панель на телефоне. Сессия читается только внутри
 * <Suspense> (меню профиля и сами страницы), поэтому каркас пререндерится.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main
          id="main"
          className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 pt-6 pb-24 md:px-6 md:pb-8"
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <NewTransactionHost />
    </div>
  );
}

import {
  ArrowLeftRight,
  ChartColumn,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

/** Пункты бокового меню (docs/design.md §6). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", Icon: LayoutDashboard },
  { href: "/transactions", label: "Операции", Icon: ArrowLeftRight },
  { href: "/categories", label: "Категории", Icon: Tags },
  { href: "/budgets", label: "Бюджеты", Icon: PiggyBank },
  { href: "/analytics", label: "Аналитика", Icon: ChartColumn },
  { href: "/settings", label: "Настройки", Icon: Settings },
];

/** Нижняя панель на телефоне: 4 пункта + кнопка «+» по центру. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[3],
  NAV_ITEMS[4],
];

/** Пункты, которые на телефоне доступны через меню профиля. */
export const MOBILE_MENU_ITEMS: NavItem[] = [NAV_ITEMS[2], NAV_ITEMS[5]];

/** Куда ведёт кнопка «+ Операция» (форма — шаг 9). */
export const NEW_TRANSACTION_HREF = "/transactions?new=1";

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

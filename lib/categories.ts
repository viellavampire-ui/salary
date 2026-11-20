import {
  Baby,
  Banknote,
  Bike,
  Book,
  Briefcase,
  Building2,
  Bus,
  Car,
  Coffee,
  Coins,
  CreditCard,
  Dog,
  Dumbbell,
  Ellipsis,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Music,
  Palette,
  Percent,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  Tv,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Палитра категорий (docs/design.md §2.3). Значения — CSS-переменные --cat-*. */
export const CATEGORY_COLORS = [
  "indigo",
  "teal",
  "amber",
  "rose",
  "sky",
  "violet",
  "lime",
  "slate",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

/** Иконки, доступные для категорий. Ключ хранится в БД. */
export const CATEGORY_ICONS = {
  ShoppingCart,
  House,
  Car,
  Bus,
  Fuel,
  Plane,
  Bike,
  UtensilsCrossed,
  Coffee,
  Pizza,
  HeartPulse,
  Pill,
  Dumbbell,
  Shirt,
  Scissors,
  Sparkles,
  Gamepad2,
  Film,
  Music,
  Tv,
  Palette,
  Wifi,
  Smartphone,
  Zap,
  Wrench,
  GraduationCap,
  Book,
  Baby,
  Dog,
  Gift,
  Receipt,
  CreditCard,
  Briefcase,
  Laptop,
  Banknote,
  Wallet,
  Coins,
  HandCoins,
  PiggyBank,
  Percent,
  TrendingUp,
  Landmark,
  Building2,
  Ellipsis,
} satisfies Record<string, LucideIcon>;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_NAMES = Object.keys(
  CATEGORY_ICONS,
) as CategoryIconName[];

export function isCategoryIconName(name: string): name is CategoryIconName {
  return Object.prototype.hasOwnProperty.call(CATEGORY_ICONS, name);
}

export type CategoryType = "income" | "expense";

/** Стандартные категории, создаются при регистрации (docs/SPEC.md §5.6). */
export const DEFAULT_CATEGORIES: {
  name: string;
  type: CategoryType;
  icon: CategoryIconName;
  color: CategoryColor;
}[] = [
  { name: "Продукты", type: "expense", icon: "ShoppingCart", color: "teal" },
  { name: "Жильё", type: "expense", icon: "House", color: "indigo" },
  { name: "Транспорт", type: "expense", icon: "Car", color: "sky" },
  {
    name: "Кафе и рестораны",
    type: "expense",
    icon: "UtensilsCrossed",
    color: "amber",
  },
  { name: "Здоровье", type: "expense", icon: "HeartPulse", color: "rose" },
  { name: "Одежда", type: "expense", icon: "Shirt", color: "violet" },
  { name: "Развлечения", type: "expense", icon: "Gamepad2", color: "lime" },
  { name: "Связь и интернет", type: "expense", icon: "Wifi", color: "sky" },
  {
    name: "Образование",
    type: "expense",
    icon: "GraduationCap",
    color: "violet",
  },
  { name: "Прочее", type: "expense", icon: "Ellipsis", color: "slate" },
  { name: "Зарплата", type: "income", icon: "Briefcase", color: "indigo" },
  { name: "Фриланс", type: "income", icon: "Laptop", color: "teal" },
  { name: "Подарки", type: "income", icon: "Gift", color: "rose" },
  { name: "Проценты", type: "income", icon: "Percent", color: "amber" },
  { name: "Прочее", type: "income", icon: "Ellipsis", color: "slate" },
];

import {
  CATEGORY_ICONS,
  isCategoryIconName,
  type CategoryColor,
} from "@/lib/categories";
import { cn } from "@/lib/utils";

/**
 * Иконка категории: линейная иконка Lucide в круге 32px,
 * фон — цвет категории с прозрачностью 15% (docs/design.md §2.3).
 */
export function CategoryIcon({
  icon,
  color,
  size = 32,
  className,
}: {
  icon: string;
  color: CategoryColor;
  size?: number;
  className?: string;
}) {
  const Icon = isCategoryIconName(icon)
    ? CATEGORY_ICONS[icon]
    : CATEGORY_ICONS.Ellipsis;

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        className,
      )}
      style={{
        width: size,
        height: size,
        color: `var(--cat-${color})`,
        backgroundColor: `color-mix(in oklab, var(--cat-${color}) 15%, transparent)`,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.75} />
    </span>
  );
}

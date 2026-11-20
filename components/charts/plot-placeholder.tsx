/**
 * Место под график, пока загружается библиотека графиков (она грузится
 * отдельно, чтобы не задерживать первую отрисовку страницы). Того же
 * размера — без прыжка разметки.
 */
export function PlotPlaceholder({ height }: { height: number }) {
  return (
    <div
      aria-hidden
      className="w-full animate-pulse rounded-md bg-border/40"
      style={{ height }}
    />
  );
}

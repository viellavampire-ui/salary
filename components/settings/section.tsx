import { cn } from "@/lib/utils";

/** Раздел страницы настроек: заголовок, пояснение, содержимое. */
export function SettingsSection({
  title,
  description,
  children,
  tone = "default",
  id,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "danger";
  id?: string;
}) {
  return (
    <section
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-card p-4 md:p-6",
        tone === "danger" && "border-expense/40",
      )}
    >
      <header className="flex flex-col gap-1">
        <h2
          id={id ? `${id}-title` : undefined}
          className={cn(
            "text-lg leading-7 font-semibold",
            tone === "danger" && "text-expense",
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs leading-4 text-expense">
      {message}
    </p>
  );
}

export const selectClass =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-72";

import { Suspense } from "react";
import type { Metadata } from "next";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/dal";
import { getCategories } from "@/server/queries/categories";

export const metadata: Metadata = { title: "Дашборд" };

/**
 * Временный дашборд (шаг 5.11 — проверка входа и стандартных категорий).
 * Полноценный каркас с сайдбаром — шаг 6, KPI и графики — шаг 10.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-6">
      <header className="flex items-center justify-between">
        <Logo href="/dashboard" />
        <ThemeToggle />
      </header>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const user = await requireUser();
  const categories = await getCategories(user.id);
  const expense = categories.filter((c) => c.type === "expense");
  const income = categories.filter((c) => c.type === "income");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-8 font-semibold">
            Здравствуйте, {user.name}
          </h1>
          <p className="text-muted-foreground">
            {user.email} · валюта {user.currency}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <CategoryList title="Категории расходов" items={expense} />
        <CategoryList title="Категории доходов" items={income} />
      </div>
    </>
  );
}

function CategoryList({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getCategories>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{items.length} шт.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <CategoryIcon icon={c.icon} color={c.color} />
              <span>{c.name}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

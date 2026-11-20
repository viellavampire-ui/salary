import Link from "next/link";
import { ChartColumn, PiggyBank, Tags } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    Icon: Tags,
    title: "Доходы и расходы по категориям",
    text: "Записывайте операции за пару секунд и раскладывайте их по понятным категориям.",
  },
  {
    Icon: ChartColumn,
    title: "Наглядные графики",
    text: "Сразу видно, куда уходят деньги и как меняется картина от месяца к месяцу.",
  },
  {
    Icon: PiggyBank,
    title: "Бюджеты и сбережения",
    text: "Ставьте лимиты на категории и следите за нормой сбережений.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-4 py-4 md:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Войти</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16 px-4 py-16 md:px-6">
        <section className="flex max-w-2xl flex-col gap-6">
          <h1 className="text-[32px] leading-10 font-semibold tracking-tight md:text-5xl md:leading-[56px]">
            Понимайте, куда уходит зарплата
          </h1>
          <p className="text-base leading-6 text-muted-foreground">
            Salary — личный финансовый аналитик: учёт доходов и расходов,
            бюджеты по категориям и понятные графики.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">Начать бесплатно</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">У меня есть аккаунт</Link>
            </Button>
          </div>
        </section>

        <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
          {FEATURES.map(({ Icon, title, text }) => (
            <li
              key={title}
              className="flex flex-col gap-3 rounded-lg border bg-surface p-6"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

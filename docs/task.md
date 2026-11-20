# Task — план реализации Salary

> **Статус:** шаги 1–14 выполнены, шаг 15 подготовлен в коде (`docs/deploy.md`) — осталось создать аккаунты Turso/Vercel и нажать Deploy.

Технический план. Нумерация совпадает с `taskGuide.md` (там те же шаги простыми словами).
Ссылки: `PRD.md`, `SPEC.md`, `design.md`.

---

## 1. Подготовка окружения
- 1.1 Установить Node.js LTS (≥ 20) и pnpm (`corepack enable`).
- 1.2 Установить Git, создать репозиторий на GitHub `salary`.
- 1.3 Установить Turso CLI, выполнить `turso auth signup` / `turso auth login`.
- 1.4 Установить VS Code + расширения: ESLint, Prettier, Tailwind CSS IntelliSense.

## 2. Создание проекта Next.js
- 2.1 `pnpm create next-app@latest salary --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*"`.
- 2.2 Включить `strict` в `tsconfig.json`, настроить Prettier (+ `prettier-plugin-tailwindcss`).
- 2.3 Создать структуру папок по `SPEC.md §3` (`components/`, `db/`, `lib/`, `server/actions`, `server/queries`).
- 2.4 Первый коммит, push в GitHub.

## 3. Дизайн-система
- 3.1 `pnpm dlx shadcn@latest init` (base color: neutral, CSS variables: yes). Конфиг — `components.json`; базовые компоненты лежат в `components/ui`.
- 3.2 Перенести токены цветов из `design.md §2` в `app/globals.css` (`:root` и `.dark`), включая `--income`, `--expense`, `--warning`, `--chart-1..8`.
- 3.3 Задать радиусы (`--radius: 8px`, `--radius-lg: 12px`) и шкалу отступов.
- 3.4 Подключить Inter через `next/font/google` (subsets `latin`, `cyrillic`), добавить утилиту `tabular-nums` для сумм.
- 3.5 Установить компоненты shadcn: button, input, label, select, dialog, sheet, drawer, dropdown-menu, tabs, table, card, badge, calendar, popover, skeleton, progress, avatar, tooltip, sonner, form.
- 3.6 Установить `next-themes`, создать `ThemeProvider` и `ThemeToggle` (light/dark/system).
- 3.7 Установить `lucide-react`; создать компонент `CategoryIcon` (круг 32px, фон 15% цвета).
- 3.8 Добавить `prefers-reduced-motion` правило в `globals.css`.

## 4. База данных Turso + Drizzle
- 4.1 `turso db create salary`; получить `turso db show salary --url` и `turso db tokens create salary`.
- 4.2 Создать `.env.local` по `SPEC.md §4`, добавить `.env*` в `.gitignore`, создать `.env.example`.
- 4.3 `pnpm add drizzle-orm @libsql/client @paralleldrive/cuid2` и `pnpm add -D drizzle-kit`.
- 4.4 Создать `db/index.ts` (createClient + drizzle) и `drizzle.config.ts` (`dialect: 'turso'`).
- 4.5 Описать в `db/schema.ts` таблицы `category`, `transaction`, `budget` с индексами (`SPEC.md §5`).
- 4.6 Добавить скрипты `db:generate`, `db:migrate`, `db:studio` в `package.json`.

## 5. Авторизация (Better Auth)
- 5.1 `pnpm add better-auth`; создать `lib/auth.ts` с drizzleAdapter (sqlite), emailAndPassword, `nextCookies()`.
- 5.2 Добавить `additionalFields` пользователя: `currency`, `monthStartDay`.
- 5.3 `npx @better-auth/cli generate` → добавить таблицы auth в схему; `pnpm db:generate && pnpm db:migrate`.
- 5.4 Создать роут `app/api/auth/[...all]/route.ts` (`toNextJsHandler`).
- 5.5 Создать `lib/auth-client.ts` (`createAuthClient`).
- 5.6 Настроить Google OAuth: Google Cloud Console → OAuth Client → redirect `http://localhost:3000/api/auth/callback/google`; добавить ключи в env и `socialProviders.google`.
- 5.7 Написать `proxy.ts` (так в Next.js 16 называется middleware) (проверка cookie, редирект на `/login?next=`).
- 5.8 Написать хелпер `requireUser()`.
- 5.9 Сверстать `/login` и `/register` (react-hook-form + Zod, кнопка Google, ошибки, loading-состояние).
- 5.10 Реализовать `db/seed.ts` — стандартные категории; вызывать в `databaseHooks.user.create.after`.
- 5.11 Проверить: регистрация → в БД появились user + 15 категорий; выход; повторный вход.

## 6. Каркас приложения (layout)
- 6.1 `app/(app)/layout.tsx`: сайдбар 248px (desktop), 72px (tablet), нижняя панель (mobile) — `design.md §5–6`.
- 6.2 Компоненты `Sidebar`, `MobileNav` (с центральной кнопкой «+»), `UserMenu` (аватар, тема, выход).
- 6.3 Компонент `PeriodPicker` (месяц ◀ ▶, состояние в URL `?period=YYYY-MM`).
- 6.4 Заглушки всех страниц: dashboard, transactions, categories, budgets, analytics, settings.
- 6.5 Корневой `/`: редирект на `/dashboard` для вошедших (в `proxy.ts`, чтобы главная оставалась статичной), иначе простой лендинг.

## 7. Утилиты
- 7.1 `lib/money.ts`: `toMinor`, `fromMinor`, `minorToInput`, `formatMoney`, `formatSigned`, `formatCompact` (45K, 1,2M), `formatPercent`, список валют.
- 7.2 `lib/period.ts`: границы месяца/квартала/года/произвольного периода, предыдущий период, учёт `monthStartDay` (1–28; месяц называется по месяцу своего начала), разбор `?period=` / `?from=&to=`.
- 7.3 `lib/validations.ts`: Zod-схемы транзакции, категории, бюджета, настроек.
- 7.4 Unit-тесты Vitest на 7.1–7.3.

## 8. Категории
- 8.1 `server/queries/categories.ts`: `getCategories(userId, type?)` с суммой за текущий месяц.
- 8.2 `server/actions/categories.ts`: `createCategory`, `updateCategory`, `archiveCategory`, `restoreCategory`. Логика — в `server/data/categories.ts` (принимает db, покрыта тестами, включая изоляцию пользователей).
- 8.3 `IconPicker` (~40 иконок Lucide) и `ColorPicker` (8 цветов палитры).
- 8.4 Страница `/categories`: вкладки «Расходы/Доходы», плитка, Sheet создания/редактирования.
- 8.5 Пустые и loading-состояния.

## 9. Операции (транзакции)
- 9.1 `server/actions/transactions.ts`: create / update / delete / restore с проверкой владения категорией.
- 9.2 `TransactionForm`: переключатель доход/расход, сумма (крупное поле), категория (сетка иконок), дата (по умолчанию сегодня), комментарий.
- 9.3 Открытие формы: Sheet (desktop), Drawer (mobile); глобальная кнопка «+ Операция» добавляет `?new=1` к текущему адресу, панель живёт в `app/(app)/layout.tsx`.
- 9.4 `server/queries/transactions.ts`: `getTransactions(userId, filters, page)` с пагинацией по 25.
- 9.5 Страница `/transactions`: фильтры (период, тип, категория, поиск) в URL; таблица (desktop), список по дням (mobile).
- 9.6 Удаление с Toast «Отменить» (5 сек) через `restoreTransaction`.
- 9.7 `revalidatePath` для dashboard/transactions/budgets после мутаций.

## 10. Дашборд и графики
- 10.1 `pnpm add recharts`.
- 10.2 `server/queries/dashboard.ts`: `getKpis`, `getExpensesByCategory`, `getIncomeBySource`, `getMonthlyTrend`, последние 5 операций.
- 10.3 `KpiCard`: лейбл, сумма (32px, tabular-nums), дельта к прошлому периоду (▲/▼ + цвет).
- 10.4 `CategoryBarChart` — горизонтальные столбцы, сортировка по убыванию, топ-8 + «Прочее», подписи сумм.
- 10.5 `IncomeExpenseChart` — 12 месяцев, сгруппированные столбцы + линия баланса.
- 10.6 Тултипы, оси, сетка по `design.md §8`; цвета из CSS-переменных (работают в обеих темах).
- 10.7 Кнопка «Показать как таблицу» для каждого графика.
- 10.8 Собрать `/dashboard` по макету `design.md §7.2`; Skeleton через `loading.tsx` / `Suspense`.
- 10.9 Пустое состояние для нового пользователя.

## 11. Бюджеты
- 11.1 Actions `upsertBudget`, `deleteBudget`; query `getBudgetsProgress`.
- 11.2 Страница `/budgets`: список с прогресс-барами, цвета по порогам 80% / 100%.
- 11.3 Виджет «Бюджеты под угрозой» на дашборде (≥ 80%).

## 12. Аналитика
- 12.1 Выбор периода: месяц / квартал / год / произвольный (date range).
- 12.2 Query `getTopExpenses`, сравнение с прошлым периодом.
- 12.3 `TrendChart` (area) — динамика расходов; накопленные расходы (текущий период против прошлого, день к дню); сравнение по категориям; структура расходов; структура доходов; топ-5 трат.
- 12.4 Идущий период сравнивается с тем же числом первых дней прошлого (`comparableRange`) — и на дашборде, и в аналитике.

## 13. Настройки
- 13.1 Форма: валюта, первый день месяца, тема.
- 13.2 `/api/export` — CSV (UTF-8 BOM, `;`), кнопка «Скачать CSV» с выбором периода.
- 13.3 Смена пароля (Better Auth `changePassword`, затем `revokeOtherSessions` — выход на других устройствах, текущая сессия сохраняется).
- 13.4 Удаление аккаунта с подтверждением вводом слова «УДАЛИТЬ» (+ пароль для входа по паролю); данные удаляются каскадом по внешним ключам.
- 13.5 День начала финансового месяца из настроек подключён к выбору месяца на дашборде, в операциях и бюджетах.

## 14. Качество и безопасность
- 14.1 Тест изоляции данных: пользователь B не читает/не меняет данные A (unit на in-memory БД).
- 14.2 E2E Playwright: регистрация → доход → расход → дашборд → бюджет → экспорт.
- 14.3 Заголовки безопасности в `next.config.ts`.
- 14.4 Проверка доступности (axe), контраст, клавиатурная навигация, фокус.
- 14.5 Проверка адаптивности 360 / 768 / 1024 / 1440px в обеих темах.
- 14.6 Lighthouse ≥ 90 / 95; оптимизация при необходимости.
  Итог (мобильный профиль, 4× замедление CPU): Accessibility 100, Best Practices 100, SEO 100 на всех страницах; Performance: главная 99, вход 96, операции 99, категории/бюджеты/настройки 96–99, дашборд 91, аналитика 94–99 (на десктопе 100). Сделано: Recharts и форма операции грузятся лениво (`next/dynamic`), график дашборда рисуется при прокрутке (`WhenVisible`) — LCP дашборда 4,3 с → 0,9 с; графики аналитики переписаны на лёгкий SVG-компонент без библиотеки (`components/charts/line-chart.tsx`) — TBT аналитики ~500 → ~180 мс.

## 15. Деплой
- 15.1 Создать проект в Vercel, подключить GitHub-репозиторий.
- 15.2 Задать env-переменные в Vercel (Turso, Better Auth, Google).
- 15.3 Применить миграции к продовой БД Turso — автоматически при каждой сборке (`vercel-build`: проверка env → миграции → `next build`).
- 15.4 Добавить продовый redirect URI в Google Cloud Console.
- 15.5 Smoke-тест на продовом URL: регистрация, операции, графики.
- 15.6 Отметить чек-лист «Критерии готовности MVP» из `SPEC.md §15`.
- 15.7 CI в GitHub Actions (`.github/workflows/ci.yml`): lint, типы, unit, prettier, e2e.

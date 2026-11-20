# SPEC — Salary (техническая спецификация)

Версия 1.0 · 20.11.2026 · Связанные документы: `PRD.md`, `design.md`, `task.md`

## 1. Стек

| Слой | Технология | Зачем |
|------|-----------|-------|
| Фреймворк | **Next.js 16** (App Router, Cache Components, TypeScript strict) | SSR/RSC, Server Actions, роутинг |
| База данных | **Turso** (libSQL, SQLite-совместимая) | Managed, edge-реплики, бесплатный тариф |
| Драйвер | `@libsql/client` | Подключение к Turso |
| ORM / миграции | **Drizzle ORM** + `drizzle-kit` | Типобезопасные запросы, миграции |
| Авторизация | **Better Auth** (Drizzle adapter, SQLite) | Email+пароль, Google OAuth, сессии в БД |
| UI | Tailwind CSS v4 + **shadcn/ui** + Lucide | Компоненты по `design.md` |
| Графики | **Recharts** | Bar, Line, Area, Tooltip |
| Формы | react-hook-form + Zod | Валидация на клиенте и сервере |
| Даты | date-fns (локаль `ru`) | Периоды, форматирование |
| Тема | next-themes | Светлая/тёмная/системная |
| Уведомления | Sonner | Toast |
| Тесты | Vitest (unit), Playwright (e2e) | |
| Качество | ESLint, Prettier, TypeScript | |
| Деплой | Vercel | |
| Пакетный менеджер | pnpm | |

## 2. Архитектура

```
Браузер ──► Next.js (Vercel)
              ├── proxy.ts              — проверка cookie сессии, редирект на /login (в Next.js 16 middleware → proxy)
              ├── app/(auth)/*          — страницы входа/регистрации
              ├── app/(app)/*           — защищённые страницы (Server Components)
              ├── app/api/auth/[...all] — обработчик Better Auth
              ├── server/actions/*      — Server Actions (мутации)
              └── server/queries/*      — чтение и агрегации (только на сервере)
                        │
                        ▼
                 Drizzle ORM ──► @libsql/client ──► Turso
```

Правила:
- Чтение данных — в Server Components через функции `server/queries/*`.
- Изменение данных — только через Server Actions (`'use server'`), каждая: проверяет сессию → валидирует Zod → пишет в БД → `revalidatePath`.
- Клиентские компоненты (`'use client'`) — только формы, графики, интерактив.
- Каждая функция доступа к данным принимает `userId` первым аргументом и обязательно фильтрует по нему.

## 3. Структура проекта

```
salary/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # сайдбар + нижняя навигация
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── budgets/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...all]/route.ts
│   │   └── export/route.ts         # CSV
│   ├── layout.tsx                  # шрифт Inter, ThemeProvider, Toaster
│   ├── page.tsx                    # лендинг / редирект
│   └── globals.css                 # design tokens
├── components/
│   ├── ui/                         # shadcn/ui
│   ├── charts/                     # CategoryBarChart, IncomeExpenseChart, TrendChart
│   ├── dashboard/                  # KpiCard, RecentTransactions
│   ├── transactions/               # TransactionForm, TransactionTable, Filters
│   ├── categories/                 # CategoryIcon, CategoryForm, IconPicker
│   └── layout/                     # Sidebar, MobileNav, ThemeToggle, PeriodPicker
├── db/
│   ├── schema.ts                   # Drizzle-схема
│   ├── index.ts                    # клиент Turso + drizzle()
│   ├── seed.ts                     # стандартные категории
│   └── migrations/
├── lib/
│   ├── auth.ts                     # конфиг Better Auth (сервер)
│   ├── auth-client.ts              # клиент Better Auth
│   ├── dal.ts                      # getSession / requireUser
│   ├── money.ts                    # копейки ↔ рубли, форматирование
│   ├── period.ts                   # расчёт границ периодов
│   └── validations.ts              # Zod-схемы
├── server/
│   ├── actions/                    # transactions.ts, categories.ts, budgets.ts, settings.ts
│   └── queries/                    # dashboard.ts, transactions.ts, analytics.ts, budgets.ts
├── proxy.ts                        # бывший middleware.ts
├── drizzle.config.ts
├── tests/ (unit, e2e)
└── .env.local
```

## 4. Переменные окружения

```
TURSO_DATABASE_URL=libsql://salary-<org>.turso.io
TURSO_AUTH_TOKEN=...
BETTER_AUTH_SECRET=...            # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Локальная разработка: можно использовать `TURSO_DATABASE_URL=file:local.db` (или `turso dev`).

## 5. Модель данных (Drizzle, SQLite)

Деньги хранятся **в минимальных единицах (копейках) как INTEGER**. Даты операций — строка `YYYY-MM-DD` (TEXT), временные метки — INTEGER (unix ms).

### 5.1 Таблицы Better Auth
Генерируются `npx @better-auth/cli generate`: `user`, `session`, `account`, `verification`.
В `user` добавляются поля (через `additionalFields`):

| Поле | Тип | По умолчанию |
|------|-----|--------------|
| `currency` | TEXT | `'RUB'` |
| `monthStartDay` | INTEGER | `1` |

### 5.2 `category`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | TEXT (cuid2) | PK |
| `userId` | TEXT | FK → user.id, ON DELETE CASCADE, NOT NULL |
| `name` | TEXT | NOT NULL, 1–40 символов |
| `type` | TEXT | `'income' \| 'expense'`, NOT NULL |
| `icon` | TEXT | имя иконки Lucide, NOT NULL |
| `color` | TEXT | один из 8 ключей палитры, NOT NULL |
| `isArchived` | INTEGER (bool) | default 0 |
| `sortOrder` | INTEGER | default 0 |
| `createdAt` | INTEGER | NOT NULL |

Индексы: `UNIQUE(userId, type, name)`, `INDEX(userId, type)`.

### 5.3 `transaction`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | TEXT (cuid2) | PK |
| `userId` | TEXT | FK → user.id, CASCADE, NOT NULL |
| `categoryId` | TEXT | FK → category.id, RESTRICT, NOT NULL |
| `type` | TEXT | `'income' \| 'expense'` (дублируется для быстрых агрегаций) |
| `amount` | INTEGER | > 0, в копейках |
| `date` | TEXT | `YYYY-MM-DD`, NOT NULL |
| `note` | TEXT | ≤ 200 символов, nullable |
| `createdAt` | INTEGER | NOT NULL |
| `updatedAt` | INTEGER | NOT NULL |

Индексы: `INDEX(userId, date)`, `INDEX(userId, categoryId, date)`.

### 5.4 `budget`

| Поле | Тип | Ограничения |
|------|-----|-------------|
| `id` | TEXT | PK |
| `userId` | TEXT | FK → user.id, CASCADE |
| `categoryId` | TEXT | FK → category.id, CASCADE |
| `amount` | INTEGER | > 0, месячный лимит в копейках |
| `createdAt` | INTEGER | |

Индексы: `UNIQUE(userId, categoryId)`.

### 5.5 Связи
```
user 1──* category 1──* transaction
user 1──* transaction
user 1──* budget *──1 category
```

### 5.6 Стандартные категории (seed при регистрации)
- **Расходы:** Продукты (`ShoppingCart`), Жильё (`Home`), Транспорт (`Car`), Кафе и рестораны (`UtensilsCrossed`), Здоровье (`HeartPulse`), Одежда (`Shirt`), Развлечения (`Gamepad2`), Связь и интернет (`Wifi`), Образование (`GraduationCap`), Прочее (`MoreHorizontal`).
- **Доходы:** Зарплата (`Briefcase`), Фриланс (`Laptop`), Подарки (`Gift`), Проценты (`Percent`), Прочее (`MoreHorizontal`).

Создаются через `databaseHooks.user.create.after` в Better Auth.

## 6. Авторизация

- `lib/auth.ts`: `betterAuth({ database: drizzleAdapter(db, { provider: 'sqlite' }), emailAndPassword: { enabled: true, minPasswordLength: 8 }, socialProviders: { google: {...} }, plugins: [nextCookies()] })`.
- Роут: `app/api/auth/[...all]/route.ts` → `toNextJsHandler(auth)`.
- `proxy.ts` (в Next.js 16 так называется middleware): проверка наличия cookie сессии (`getSessionCookie`) для путей `/(app)/*`; без неё → редирект на `/login?next=...`.
- В Server Components/Actions — полноценная проверка: `auth.api.getSession({ headers: await headers() })`; при отсутствии — `redirect('/login')`.
- Хелпер `requireUser()` в `lib/dal.ts` (Data Access Layer) возвращает `user` или делает редирект.
- С `cacheComponents` чтение сессии допускается только внутри `<Suspense>`: страницы рендерят статичную оболочку, а блок с данными пользователя подгружается потоком.

## 7. Server Actions (мутации)

Все возвращают `{ ok: true, data } | { ok: false, error, fieldErrors? }`.

| Action | Вход (Zod) | Действие |
|--------|-----------|----------|
| `createTransaction` | `{ type, amount: string, categoryId, date, note? }` | Парсит сумму → копейки, проверяет, что категория принадлежит пользователю и тип совпадает |
| `updateTransaction` | `{ id, ...поля }` | Проверка владельца |
| `deleteTransaction` | `{ id }` | Возвращает удалённую запись для «Отменить» |
| `restoreTransaction` | запись | Повторная вставка |
| `createCategory` / `updateCategory` | `{ name, type, icon, color }` | Уникальность имени |
| `archiveCategory` | `{ id }` | Нельзя удалить категорию с операциями — только архивировать |
| `upsertBudget` / `deleteBudget` | `{ categoryId, amount }` | Только для expense-категорий |
| `updateSettings` | `{ currency, monthStartDay }` | |
| `deleteAccount` | `{ confirm: 'УДАЛИТЬ' }` | `auth.api.deleteUser`, каскадное удаление |

После мутации: `revalidatePath('/dashboard')`, `revalidatePath('/transactions')` и т.д.

## 8. Запросы и агрегации

`server/queries/*` (все с `userId`):

| Функция | Возвращает | SQL-суть |
|---------|-----------|----------|
| `getKpis(userId, period)` | `{ income, expense, balance, savingsRate, incomeDelta, expenseDelta }` | `SUM(CASE WHEN type=...)` за период и прошлый период |
| `getExpensesByCategory(userId, period)` | `[{ categoryId, name, icon, color, total }]` | `GROUP BY categoryId ORDER BY total DESC` |
| `getIncomeBySource(userId, period)` | то же для income | |
| `getMonthlyTrend(userId, months=12)` | `[{ month: 'YYYY-MM', income, expense, balance }]` | `GROUP BY substr(date,1,7)` |
| `getTransactions(userId, filters, page)` | `{ items, total }` | Фильтры + `LIMIT 25 OFFSET` |
| `getBudgetsProgress(userId, period)` | `[{ category, limit, spent, percent }]` | JOIN budget + SUM transaction |
| `getTopExpenses(userId, period, 5)` | Топ-5 операций | `ORDER BY amount DESC LIMIT 5` |

`savingsRate = income > 0 ? (income − expense) / income : 0`.
Периоды (`lib/period.ts`): `month`, `quarter`, `year`, `custom`; учитывают `monthStartDay` пользователя.

## 9. Маршруты и страницы

| Путь | Тип | Содержимое |
|------|-----|-----------|
| `/` | public | Лендинг, если не вошёл; иначе редирект на `/dashboard` |
| `/login`, `/register` | public | Формы авторизации |
| `/dashboard?period=2026-11` | protected | KPI, графики, последние операции |
| `/transactions?type=&category=&from=&to=&q=&page=` | protected | Таблица + фильтры (состояние в URL) |
| `/categories` | protected | Вкладки расходы/доходы |
| `/budgets` | protected | Прогресс бюджетов |
| `/analytics?from=&to=` | protected | Расширенные графики |
| `/settings` | protected | Валюта, тема, экспорт, удаление аккаунта |
| `/api/export?from=&to=` | protected | CSV (UTF-8 BOM, разделитель `;`) |

## 10. Компоненты графиков

| Компонент | Recharts | Props |
|-----------|----------|-------|
| `CategoryBarChart` | `BarChart layout="vertical"` | `data`, `currency`; топ-8 + «Прочее» |
| `IncomeExpenseChart` | `ComposedChart` (2 `Bar` + `Line`) | `data` (12 месяцев) |
| `TrendChart` | `AreaChart` | `data`, `series` |
| `BudgetProgress` | shadcn `Progress` | `spent`, `limit` |

Все — клиентские, получают уже агрегированные данные от сервера. Цвета берутся из CSS-переменных (`var(--chart-1)` …). Обёрнуты в `ResponsiveContainer`, анимация 250 мс, отключается при `prefers-reduced-motion`.

## 11. Валидация и работа с деньгами

- `lib/money.ts`: `toMinor("1 234,56") → 123456`, `fromMinor(123456) → 1234.56`, `formatMoney(minor, currency)` через `Intl.NumberFormat('ru-RU')`.
- Ввод суммы: принимает запятую и точку, пробелы; максимум 999 999 999,99.
- Дата: не раньше 2000-01-01 и не позже сегодня + 1 год.

## 12. Безопасность

- Каждая query/action начинает с `requireUser()`.
- Проверка владения связанными сущностями (categoryId принадлежит userId).
- Zod на сервере даже если форма уже валидировала на клиенте.
- Rate-limit Better Auth (встроенный, в продакшене не больше 3 входов/регистраций за 10 с). Отключается только переменной `E2E_DISABLE_RATE_LIMIT=1` в `playwright.config.ts`.
- Секреты только в env; `.env*` в `.gitignore`.
- Заголовки в `next.config.ts`: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS (только для https), без `X-Powered-By`.
- **CSP без nonce.** Nonce требует динамического рендера и несовместим с частичным пререндером (PPR), на котором построены страницы. Поэтому `script-src 'self' 'unsafe-inline'` (встроенные скрипты Next.js и скрипт темы), всё остальное — только свой домен; `object-src 'none'`, `frame-ancestors 'none'`, `base-uri`/`form-action 'self'`. Zod работает в режиме `jitless`, чтобы не пробовать `new Function` под CSP.
- Редирект после входа (`?next=`) — только на внутренние пути.
- Экспорт CSV: только свои операции, `Cache-Control: no-store`, защита от CSV-инъекций (значения на `= + - @` предваряются апострофом).

## 13. Тестирование

| Тип | Что покрываем |
|-----|---------------|
| Unit (Vitest, `pnpm test`) | `money`, `period`, `analytics`, `csv`, Zod-схемы; слой данных (`server/data/*`) на базе в памяти |
| Изоляция данных | Для категорий, операций, бюджетов, дашборда, аналитики, экспорта: пользователь A не видит и не меняет данные B (unit + e2e) |
| E2E (Playwright, `pnpm test:e2e`) | Путь пользователя: регистрация → доход и расходы → дашборд → категории → поиск → бюджет → аналитика → экспорт CSV → валюта → выход/вход |
| Безопасность (e2e) | Редиректы без входа, 401 у экспорта, заголовки, безопасный `?next=`, изоляция по HTTP |
| Доступность (e2e, axe) | WCAG 2.1 AA на всех 9 страницах в светлой и тёмной теме + форма операции |
| Адаптивность (e2e) | Нет горизонтальной прокрутки на 360 / 768 / 1024 / 1440 px |

E2E поднимает собственный продакшен-сервер на порту 3100 с отдельной базой `e2e.db` (`scripts/e2e-db.mjs`).

## 14. Деплой

Пошагово, простыми словами — `docs/deploy.md`.

1. `turso db create salary` → URL (`turso db show salary --url`) и токен (`turso db tokens create salary`).
2. Vercel: импорт репозитория; env `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET` (Production + Preview).
3. Сборка на Vercel идёт через скрипт `vercel-build`: `scripts/check-env.mjs` (понятные ошибки на русском) → `scripts/migrate.mjs` (миграции, идемпотентно) → `next build`.
4. Адрес для Better Auth: `BETTER_AUTH_URL` (свой домен) → `VERCEL_PROJECT_PRODUCTION_URL` (Production) → `VERCEL_URL` (preview). Для `*.vercel.app` ничего задавать не нужно.
5. Google (по желанию): redirect URI `https://<домен>/api/auth/callback/google`, env `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
6. Проверка: `GET /api/health` → `{"status":"ok"}` (динамический, на каждый запрос проверяет базу; при сбое — `503`).
7. CI: `.github/workflows/ci.yml` — lint, типы, unit, prettier, затем e2e Playwright.

## 15. Критерии готовности MVP

Состояние на 20.11.2026:

- [x] Регистрация, вход по email, выход работают (e2e). Вход через Google реализован, но **не проверен** — нужны ключи Google Cloud.
- [x] CRUD операций и категорий (unit + e2e).
- [x] Дашборд показывает 4 KPI и графики, корректно считает суммы (unit + e2e).
- [x] Данные изолированы между пользователями (unit для всех разделов + e2e по HTTP).
- [x] Светлая и тёмная тема соответствуют `design.md`; цвета графиков проверены валидатором палитры, контраст текста ≥ 4.5:1.
- [x] Адаптивность: нет горизонтальной прокрутки на 360 / 768 / 1024 / 1440 px (e2e). 1920 px — тот же макет с max-width 1280px.
- [~] Lighthouse (мобильный профиль): Accessibility 100 на всех страницах; Performance ≥ 90 везде, кроме «Аналитики» — 86 (на десктопе 100).
- [ ] Задеплоено на Vercel — код и инструкция готовы (`docs/deploy.md`), нужны аккаунты Turso и Vercel владельца.

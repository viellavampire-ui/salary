# SPEC — Salary (техническая спецификация)

Версия 1.0 · 20.11.2026 · Связанные документы: `PRD.md`, `design.md`, `task.md`

## 1. Стек

| Слой | Технология | Зачем |
|------|-----------|-------|
| Фреймворк | **Next.js** (App Router, TypeScript strict) | SSR/RSC, Server Actions, роутинг |
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
              ├── middleware.ts         — проверка сессии, редирект на /login
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
│   ├── money.ts                    # копейки ↔ рубли, форматирование
│   ├── period.ts                   # расчёт границ периодов
│   └── validations.ts              # Zod-схемы
├── server/
│   ├── actions/                    # transactions.ts, categories.ts, budgets.ts, settings.ts
│   └── queries/                    # dashboard.ts, transactions.ts, analytics.ts, budgets.ts
├── middleware.ts
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
- `middleware.ts`: проверка наличия cookie сессии (`getSessionCookie`) для путей `/(app)/*`; без неё → редирект на `/login?next=...`.
- В Server Components/Actions — полноценная проверка: `auth.api.getSession({ headers: await headers() })`; при отсутствии — `redirect('/login')`.
- Хелпер `requireUser()` в `lib/auth.ts` возвращает `user` или делает редирект.

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
- Rate-limit Better Auth для входа (встроенный).
- Секреты только в env; `.env*` в `.gitignore`.
- Заголовки безопасности в `next.config.ts` (CSP, X-Frame-Options, Referrer-Policy).

## 13. Тестирование

| Тип | Что покрываем |
|-----|---------------|
| Unit (Vitest) | `money.ts`, `period.ts`, Zod-схемы, агрегации на тестовой БД (`file::memory:`) |
| Изоляция данных | Пользователь A не видит/не меняет данные пользователя B |
| E2E (Playwright) | Регистрация → добавить доход и расход → увидеть их на дашборде → создать бюджет → экспорт |

## 14. Деплой

1. `turso db create salary` → получить URL и токен.
2. `pnpm drizzle-kit migrate` на продовую БД.
3. Vercel: подключить репозиторий, задать env, `BETTER_AUTH_URL` = продовый домен.
4. Google Cloud Console: redirect URI `https://<домен>/api/auth/callback/google`.

## 15. Критерии готовности MVP

- [ ] Регистрация, вход (email + Google), выход работают.
- [ ] CRUD операций и категорий.
- [ ] Дашборд показывает 4 KPI и 3 графика, корректно считает суммы.
- [ ] Данные изолированы между пользователями (тест).
- [ ] Светлая и тёмная тема соответствуют `design.md`.
- [ ] Адаптивность 360–1920px.
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95.
- [ ] Задеплоено на Vercel.

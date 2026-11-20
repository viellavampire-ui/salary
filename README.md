# Salary — финансовый аналитик

Веб-приложение для личного учёта доходов и расходов по категориям, с бюджетами и графиками.

> **Статус:** готовы шаги 1–12 из [`docs/task.md`](docs/task.md): проект на Next.js 16, дизайн-система, база данных (Turso + Drizzle), авторизация (Better Auth), стандартные категории и каркас приложения (сайдбар, нижняя панель на телефоне, меню профиля, выбор месяца), утилиты для денег, периодов и валидации с тестами, раздел «Категории» (создание, редактирование, архив) и «Операции» (добавление с любой страницы, фильтры, поиск, редактирование, удаление с отменой) дашборд (показатели месяца, графики, последние операции) бюджеты (лимиты по категориям, статусы 80% / 100%, блок на дашборде) и аналитика (любой период, сравнение с прошлым, динамика, топ трат). Разделы пока заглушки: операции — шаг 9, графики — шаг 10.

## Возможности (MVP)

- Регистрация и вход: email + пароль, Google ✅
- Категории доходов и расходов (иконка + цвет, архив) ✅
- Учёт доходов и расходов: фильтры, поиск, страницы по 25 ✅
- Дашборд: доходы, расходы, баланс, норма сбережений и графики ✅
- Расходы по категориям, динамика за 12 месяцев, доходы по источникам ✅
- Бюджеты (месячные лимиты по категориям) ✅
- Аналитика за произвольный период ✅
- Экспорт в CSV
- Светлая и тёмная тема ✅, адаптивность от телефона до десктопа

## Стек

Next.js 16 (App Router, Cache Components, TypeScript) · Turso (libSQL) · Drizzle ORM · Better Auth · Tailwind CSS 4 + компоненты в стиле shadcn/ui (Radix) · Lucide · Zod · react-hook-form · Vitest · Recharts · Vercel

## Быстрый старт

Нужны Node.js 20+ и pnpm (`corepack enable`).

```bash
pnpm install
cp .env.example .env.local
```

В `.env.local` заполните `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). Для локальной разработки база — обычный файл `file:local.db`, Turso не обязателен. Ключи Google можно оставить пустыми: тогда кнопка «Войти через Google» скрыта.

```bash
pnpm db:migrate
pnpm dev
```

Откройте http://localhost:3000.

### Подключение Turso

```bash
turso db create salary
turso db show salary --url
turso db tokens create salary
```

Подставьте URL и токен в `TURSO_DATABASE_URL` и `TURSO_AUTH_TOKEN`, затем выполните `pnpm db:migrate`.

## Команды

| Команда | Что делает |
|---------|-----------|
| `pnpm dev` | Сервер разработки |
| `pnpm build` / `pnpm start` | Продакшен-сборка и запуск |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | ESLint · TypeScript · Vitest |
| `pnpm format` | Prettier (с сортировкой классов Tailwind) |
| `pnpm db:generate` | Создать миграцию из `db/schema.ts` |
| `pnpm db:migrate` | Применить миграции |
| `pnpm db:studio` | Просмотр базы в браузере |

## Структура

```
app/
  (auth)/login, (auth)/register   страницы входа и регистрации
  (app)/layout.tsx                каркас: сайдбар, шапка и нижняя панель на телефоне
  (app)/dashboard, transactions…  защищённые страницы
  api/auth/[...all]               обработчик Better Auth
components/ui                     базовые компоненты (Button, Input, Card…)
components/layout                сайдбар, меню профиля, выбор месяца, заголовки
components/auth, categories, theme
db/schema.ts, db/migrations       схема и миграции Drizzle
db/seed.ts                        стандартные категории
lib/auth.ts, lib/dal.ts           конфиг Better Auth, проверка сессии
lib/categories.ts                 иконки, палитра, стандартные категории
lib/money.ts                      копейки ↔ рубли, форматирование сумм
lib/period.ts                     месяцы, кварталы, годы, финансовый месяц
lib/validations.ts                Zod-схемы форм и Server Actions
proxy.ts                          редирект на /login без сессии
server/data                       логика работы с БД (всегда по userId, покрыта тестами)
server/queries, server/actions    чтение данных и Server Actions поверх server/data
tests/                            unit-тесты
docs/                             PRD, SPEC, дизайн, план
```

## Документация

| Файл | Описание |
|------|----------|
| [`docs/PRD.md`](docs/PRD.md) | Требования к продукту: цели, аудитория, пользовательские истории, этапы |
| [`docs/SPEC.md`](docs/SPEC.md) | Техническая спецификация: архитектура, схема БД, авторизация, API, тесты, деплой |
| [`docs/design.md`](docs/design.md) | Дизайн-система: цвета, типографика, экраны, графики, анимация |
| [`docs/task.md`](docs/task.md) | Пошаговый технический план (1, 1.1, 1.2 …) |
| [`docs/taskGuide.md`](docs/taskGuide.md) | Тот же план простыми словами для непрограммистов |

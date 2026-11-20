import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { alertDescription, alertTitle } from "@/lib/notifications";
import { upsertBudget } from "@/server/data/budgets";
import {
  countUnread,
  evaluateBudgetAlerts,
  listNotifications,
  markNotificationsRead,
} from "@/server/data/notifications";
import { createTestDb, createUser } from "./helpers/db";

let db: Database;
const today = "2026-11-20";

async function cat(userId: string, name: string) {
  const [row] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.userId, userId),
        eq(schema.categories.name, name),
      ),
    );
  return row.id;
}

async function spend(
  userId: string,
  categoryId: string,
  amount: number,
  date = "2026-11-10",
) {
  await db
    .insert(schema.transactions)
    .values({ userId, categoryId, type: "expense", amount, date });
}

const plain = (s: string) => s.replace(/[  ]/g, " ");

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, "alice");
  await createUser(db, "bob");
});

describe("evaluateBudgetAlerts", () => {
  it("80% → предупреждение, 100%+ → превышение, каждое один раз", async () => {
    const food = await cat("alice", "Продукты");
    await upsertBudget(db, "alice", { categoryId: food, amount: 10000 });

    await spend("alice", food, 5000);
    expect(await evaluateBudgetAlerts(db, "alice", [food], today)).toEqual([]);

    await spend("alice", food, 3500); // 85%
    const warn = await evaluateBudgetAlerts(db, "alice", [food], today);
    expect(warn).toMatchObject([
      {
        kind: "budget_warning",
        categoryName: "Продукты",
        month: "2026-11",
        spent: 8500,
        limit: 10000,
      },
    ]);

    await spend("alice", food, 500); // 90% — порог уже был
    expect(await evaluateBudgetAlerts(db, "alice", [food], today)).toEqual([]);

    await spend("alice", food, 2000); // 110%
    expect(
      await evaluateBudgetAlerts(db, "alice", [food], today),
    ).toMatchObject([{ kind: "budget_over", spent: 11000 }]);
    expect(await evaluateBudgetAlerts(db, "alice", [food], today)).toEqual([]);

    expect(await countUnread(db, "alice")).toBe(2);
  });

  it("сразу больше 100% — только «превышен», без предупреждения", async () => {
    const cafe = await cat("alice", "Кафе и рестораны");
    await upsertBudget(db, "alice", { categoryId: cafe, amount: 1000 });
    await spend("alice", cafe, 5000);
    const alerts = await evaluateBudgetAlerts(db, "alice", [cafe], today);
    expect(alerts.map((a) => a.kind)).toEqual(["budget_over"]);
  });

  it("считается только текущий финансовый месяц", async () => {
    const food = await cat("alice", "Продукты");
    await upsertBudget(db, "alice", { categoryId: food, amount: 1000 });
    await spend("alice", food, 5000, "2026-10-15"); // прошлый месяц
    expect(await evaluateBudgetAlerts(db, "alice", [food], today)).toEqual([]);
    // при начале месяца 25-го 20.11 относится к «октябрю» (25.10–24.11);
    // 15.10 в него не входит — считаются только 900 из 1000 (90%)
    await spend("alice", food, 900, "2026-10-26");
    expect(
      await evaluateBudgetAlerts(db, "alice", [food], today, 25),
    ).toMatchObject([{ kind: "budget_warning", month: "2026-10", spent: 900 }]);
  });

  it("в следующем месяце пороги срабатывают заново", async () => {
    const food = await cat("alice", "Продукты");
    await upsertBudget(db, "alice", { categoryId: food, amount: 1000 });
    await spend("alice", food, 900, "2026-11-05");
    expect(
      await evaluateBudgetAlerts(db, "alice", [food], "2026-11-20"),
    ).toHaveLength(1);
    await spend("alice", food, 900, "2026-12-05");
    expect(
      await evaluateBudgetAlerts(db, "alice", [food], "2026-12-20"),
    ).toMatchObject([{ month: "2026-12" }]);
  });

  it("категории без бюджета и непереданные категории не проверяются", async () => {
    const food = await cat("alice", "Продукты");
    const cafe = await cat("alice", "Кафе и рестораны");
    await upsertBudget(db, "alice", { categoryId: cafe, amount: 100 });
    await spend("alice", food, 99999);
    await spend("alice", cafe, 99999);
    expect(await evaluateBudgetAlerts(db, "alice", [food], today)).toEqual([]);
    expect(await evaluateBudgetAlerts(db, "alice", [], today)).toEqual([]);
  });
});

describe("список и прочтение", () => {
  it("новые сверху, отметка выбранных и всех", async () => {
    const food = await cat("alice", "Продукты");
    const cafe = await cat("alice", "Кафе и рестораны");
    await upsertBudget(db, "alice", { categoryId: food, amount: 100 });
    await upsertBudget(db, "alice", { categoryId: cafe, amount: 100 });
    await spend("alice", food, 500);
    await evaluateBudgetAlerts(db, "alice", [food], today);
    await spend("alice", cafe, 500);
    await evaluateBudgetAlerts(db, "alice", [cafe], today);

    const list = await listNotifications(db, "alice");
    expect(list).toHaveLength(2);
    expect(list.every((n) => n.readAt === null)).toBe(true);

    await markNotificationsRead(db, "alice", [list[0].id]);
    expect(await countUnread(db, "alice")).toBe(1);
    await markNotificationsRead(db, "alice");
    expect(await countUnread(db, "alice")).toBe(0);
  });
});

describe("изоляция данных между пользователями", () => {
  it("чужие уведомления не видны и не отмечаются прочитанными", async () => {
    const bobFood = await cat("bob", "Продукты");
    await upsertBudget(db, "bob", { categoryId: bobFood, amount: 100 });
    await spend("bob", bobFood, 500);
    await evaluateBudgetAlerts(db, "bob", [bobFood], today);

    // попытка alice проверить чужую категорию ничего не создаёт
    expect(await evaluateBudgetAlerts(db, "alice", [bobFood], today)).toEqual(
      [],
    );
    expect(await listNotifications(db, "alice")).toEqual([]);

    const [bobNote] = await listNotifications(db, "bob");
    await markNotificationsRead(db, "alice", [bobNote.id]);
    await markNotificationsRead(db, "alice");
    expect(await countUnread(db, "bob")).toBe(1);
  });
});

describe("тексты", () => {
  it("заголовок и описание", () => {
    const base = {
      categoryName: "Кафе",
      month: "2026-11",
      spent: 450000,
      limit: 500000,
    };
    expect(plain(alertTitle({ ...base, kind: "budget_warning" }))).toBe(
      "Бюджет «Кафе»: потрачено 90 %",
    );
    expect(alertTitle({ ...base, kind: "budget_over", spent: 600000 })).toBe(
      "Бюджет «Кафе» превышен",
    );
    expect(plain(alertDescription(base, "RUB"))).toBe(
      "4 500 ₽ из 5 000 ₽ · Ноябрь 2026",
    );
  });
});

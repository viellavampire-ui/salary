import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import {
  getCategoryTotals,
  getKpis,
  getMonthlyTrend,
  getRecentTransactions,
  hasAnyTransactions,
} from "@/server/data/dashboard";
import { createTestDb, createUser } from "./helpers/db";

let db: Database;
const nov = { from: "2026-11-01", to: "2026-11-30" };
const oct = { from: "2026-10-01", to: "2026-10-31" };

async function cat(userId: string, name: string, type = "expense") {
  const [row] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.userId, userId),
        eq(schema.categories.name, name),
        eq(schema.categories.type, type as "expense"),
      ),
    );
  return row.id;
}

async function add(
  userId: string,
  name: string,
  amount: number,
  date: string,
  type: "income" | "expense" = "expense",
) {
  await db.insert(schema.transactions).values({
    userId,
    categoryId: await cat(userId, name, type),
    type,
    amount,
    date,
  });
}

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, "alice");
  await createUser(db, "bob");
});

describe("getKpis", () => {
  it("считает доходы, расходы, баланс, норму сбережений и изменения", async () => {
    await add("alice", "Зарплата", 20000000, "2026-11-05", "income");
    await add("alice", "Продукты", 5000000, "2026-11-10");
    await add("alice", "Жильё", 3000000, "2026-11-01");
    await add("alice", "Зарплата", 16000000, "2026-10-05", "income");
    await add("alice", "Продукты", 10000000, "2026-10-12");

    const k = await getKpis(db, "alice", nov, oct);
    expect(k).toMatchObject({
      income: 20000000,
      expense: 8000000,
      balance: 12000000,
      savingsRate: 0.6,
      previous: { income: 16000000, expense: 10000000, balance: 6000000 },
    });
    expect(k.incomeDelta).toBeCloseTo(0.25);
    expect(k.expenseDelta).toBeCloseTo(-0.2);
  });

  it("без доходов норма сбережений и изменения — null", async () => {
    await add("alice", "Продукты", 1000, "2026-11-10");
    const k = await getKpis(db, "alice", nov, oct);
    expect(k).toMatchObject({
      income: 0,
      expense: 1000,
      balance: -1000,
      savingsRate: null,
      incomeDelta: null,
      expenseDelta: null,
    });
  });
});

describe("getCategoryTotals", () => {
  it("группирует по категориям и сортирует по убыванию", async () => {
    await add("alice", "Продукты", 1000, "2026-11-10");
    await add("alice", "Продукты", 2500, "2026-11-11");
    await add("alice", "Жильё", 9000, "2026-11-01");
    await add("alice", "Транспорт", 500, "2026-10-30"); // прошлый месяц
    await add("alice", "Зарплата", 99999, "2026-11-05", "income");

    const rows = await getCategoryTotals(db, "alice", nov, "expense");
    expect(rows.map((r) => [r.name, r.total])).toEqual([
      ["Жильё", 9000],
      ["Продукты", 3500],
    ]);
    expect(rows[0]).toMatchObject({ icon: "House", color: "indigo" });
  });
});

describe("getMonthlyTrend", () => {
  it("раскладывает по календарным месяцам, включая пустые", async () => {
    await add("alice", "Зарплата", 100, "2026-09-30", "income");
    await add("alice", "Продукты", 30, "2026-11-01");
    await add("alice", "Зарплата", 200, "2026-11-30", "income");

    const trend = await getMonthlyTrend(db, "alice", [
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(trend).toEqual([
      { month: "2026-09", income: 100, expense: 0, balance: 100 },
      { month: "2026-10", income: 0, expense: 0, balance: 0 },
      { month: "2026-11", income: 200, expense: 30, balance: 170 },
    ]);
  });

  it("учитывает финансовый месяц с 10-го числа", async () => {
    await add("alice", "Продукты", 1, "2026-11-09"); // ещё октябрь
    await add("alice", "Продукты", 2, "2026-11-10"); // уже ноябрь
    await add("alice", "Продукты", 4, "2026-12-09"); // всё ещё ноябрь
    const trend = await getMonthlyTrend(
      db,
      "alice",
      ["2026-10", "2026-11"],
      10,
    );
    expect(trend.map((p) => p.expense)).toEqual([1, 6]);
  });
});

describe("getRecentTransactions / hasAnyTransactions", () => {
  it("последние операции периода, новые сверху", async () => {
    await add("alice", "Продукты", 1, "2026-11-01");
    await add("alice", "Продукты", 2, "2026-11-20");
    await add("alice", "Продукты", 3, "2026-12-01");
    const recent = await getRecentTransactions(db, "alice", nov, 5);
    expect(recent.map((r) => r.amount)).toEqual([2, 1]);
    expect(await hasAnyTransactions(db, "alice")).toBe(true);
    expect(await hasAnyTransactions(db, "bob")).toBe(false);
  });
});

describe("изоляция данных между пользователями", () => {
  it("агрегаты не включают чужие операции", async () => {
    await add("bob", "Зарплата", 50000000, "2026-11-05", "income");
    await add("bob", "Продукты", 7000000, "2026-11-06");

    expect(await getKpis(db, "alice", nov, oct)).toMatchObject({
      income: 0,
      expense: 0,
    });
    expect(await getCategoryTotals(db, "alice", nov, "expense")).toEqual([]);
    expect((await getMonthlyTrend(db, "alice", ["2026-11"]))[0]).toMatchObject({
      income: 0,
      expense: 0,
    });
    expect(await getRecentTransactions(db, "alice", nov)).toEqual([]);
  });
});

describe("analytics data", () => {
  it("getDailyTotals и getTopTransactions — по типу, периоду и пользователю", async () => {
    const { getDailyTotals, getTopTransactions } =
      await import("@/server/data/analytics");
    await add("alice", "Продукты", 100, "2026-11-02");
    await add("alice", "Продукты", 50, "2026-11-02");
    await add("alice", "Жильё", 9000, "2026-11-01");
    await add("alice", "Зарплата", 99999, "2026-11-05", "income");
    await add("alice", "Транспорт", 77777, "2026-10-31");
    await add("bob", "Продукты", 88888, "2026-11-02");

    expect(await getDailyTotals(db, "alice", nov, "expense")).toEqual([
      { date: "2026-11-01", total: 9000 },
      { date: "2026-11-02", total: 150 },
    ]);
    const top = await getTopTransactions(db, "alice", nov, "expense", 2);
    expect(top.map((t) => [t.categoryName, t.amount])).toEqual([
      ["Жильё", 9000],
      ["Продукты", 100],
    ]);
  });
});

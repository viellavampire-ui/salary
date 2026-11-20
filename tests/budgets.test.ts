import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import {
  budgetStatus,
  deleteBudget,
  listBudgetProgress,
  upsertBudget,
} from "@/server/data/budgets";
import { setCategoryArchived } from "@/server/data/categories";
import { createTestDb, createUser } from "./helpers/db";

let db: Database;
const nov = { from: "2026-11-01", to: "2026-11-30" };

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

async function spend(
  userId: string,
  name: string,
  amount: number,
  date = "2026-11-10",
) {
  await db.insert(schema.transactions).values({
    userId,
    categoryId: await cat(userId, name),
    type: "expense",
    amount,
    date,
  });
}

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, "alice");
  await createUser(db, "bob");
});

describe("budgetStatus", () => {
  it.each([
    [0, 1000, "ok"],
    [799, 1000, "ok"],
    [800, 1000, "warning"],
    [1000, 1000, "warning"],
    [1001, 1000, "over"],
  ])("потрачено %i из %i → %s", (spent, limit, status) => {
    expect(budgetStatus(spent, limit)).toBe(status);
  });
});

describe("upsertBudget", () => {
  it("создаёт и затем меняет лимит (один бюджет на категорию)", async () => {
    const food = await cat("alice", "Продукты");
    expect(
      (await upsertBudget(db, "alice", { categoryId: food, amount: 1000000 }))
        .ok,
    ).toBe(true);
    expect(
      (await upsertBudget(db, "alice", { categoryId: food, amount: 1500000 }))
        .ok,
    ).toBe(true);

    const rows = await db.select().from(schema.budgets);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(1500000);
  });

  it("только для активных категорий расходов", async () => {
    const salary = await cat("alice", "Зарплата", "income");
    expect(
      await upsertBudget(db, "alice", { categoryId: salary, amount: 100 }),
    ).toMatchObject({
      ok: false,
      error: "Бюджет задаётся только для категорий расходов",
    });

    const clothes = await cat("alice", "Одежда");
    await setCategoryArchived(db, "alice", clothes, true);
    expect(
      await upsertBudget(db, "alice", { categoryId: clothes, amount: 100 }),
    ).toMatchObject({
      ok: false,
      error: "Категория в архиве",
    });
  });
});

describe("listBudgetProgress", () => {
  it("считает траты за период и статус, самые «горящие» сверху", async () => {
    const food = await cat("alice", "Продукты");
    const cafe = await cat("alice", "Кафе и рестораны");
    const transport = await cat("alice", "Транспорт");
    await upsertBudget(db, "alice", { categoryId: food, amount: 10000 });
    await upsertBudget(db, "alice", { categoryId: cafe, amount: 5000 });
    await upsertBudget(db, "alice", { categoryId: transport, amount: 3000 });

    await spend("alice", "Продукты", 4000);
    await spend("alice", "Продукты", 99999, "2026-10-31"); // прошлый месяц
    await spend("alice", "Кафе и рестораны", 4500);
    await spend("alice", "Транспорт", 3500);

    const rows = await listBudgetProgress(db, "alice", nov);
    expect(rows.map((r) => [r.name, r.spent, r.limit, r.status])).toEqual([
      ["Транспорт", 3500, 3000, "over"],
      ["Кафе и рестораны", 4500, 5000, "warning"],
      ["Продукты", 4000, 10000, "ok"],
    ]);
  });

  it("бюджеты архивных категорий не показываются", async () => {
    const clothes = await cat("alice", "Одежда");
    await upsertBudget(db, "alice", { categoryId: clothes, amount: 1000 });
    await setCategoryArchived(db, "alice", clothes, true);
    expect(await listBudgetProgress(db, "alice", nov)).toEqual([]);
  });
});

describe("deleteBudget", () => {
  it("удаляет и возвращает данные для отмены", async () => {
    const food = await cat("alice", "Продукты");
    await upsertBudget(db, "alice", { categoryId: food, amount: 777 });
    const r = await deleteBudget(db, "alice", food);
    expect(r).toEqual({ ok: true, data: { categoryId: food, amount: 777 } });
    expect(await listBudgetProgress(db, "alice", nov)).toEqual([]);
    expect((await deleteBudget(db, "alice", food)).ok).toBe(false);
  });
});

describe("изоляция данных между пользователями", () => {
  it("нельзя задать бюджет на чужую категорию или удалить чужой бюджет", async () => {
    const bobFood = await cat("bob", "Продукты");
    expect(
      (await upsertBudget(db, "alice", { categoryId: bobFood, amount: 1 })).ok,
    ).toBe(false);

    await upsertBudget(db, "bob", { categoryId: bobFood, amount: 5000 });
    expect((await deleteBudget(db, "alice", bobFood)).ok).toBe(false);

    await spend("bob", "Продукты", 4900);
    expect(await listBudgetProgress(db, "alice", nov)).toEqual([]);
    expect(await listBudgetProgress(db, "bob", nov)).toMatchObject([
      { spent: 4900, limit: 5000, status: "warning" },
    ]);
  });

  it("траты чужого пользователя не попадают в мой бюджет", async () => {
    const food = await cat("alice", "Продукты");
    await upsertBudget(db, "alice", { categoryId: food, amount: 5000 });
    await spend("bob", "Продукты", 4900);
    expect(await listBudgetProgress(db, "alice", nov)).toMatchObject([
      { spent: 0 },
    ]);
  });
});

import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { setCategoryArchived } from "@/server/data/categories";
import {
  PAGE_SIZE,
  createTransaction,
  deleteTransaction,
  listTransactions,
  restoreTransaction,
  updateTransaction,
} from "@/server/data/transactions";
import { createTestDb, createUser } from "./helpers/db";

let db: Database;
const november = { from: "2026-11-01", to: "2026-11-30" };

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
  categoryId: string,
  amount: number,
  date = "2026-11-10",
  type: "income" | "expense" = "expense",
  note: string | null = null,
) {
  const r = await createTransaction(db, userId, {
    type,
    amount,
    categoryId,
    date,
    note,
  });
  if (!r.ok) throw new Error(r.error);
  return r.data.id;
}

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, "alice");
  await createUser(db, "bob");
});

describe("createTransaction", () => {
  it("создаёт операцию", async () => {
    const id = await add("alice", await cat("alice", "Продукты"), 125050);
    const list = await listTransactions(db, "alice", november);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({
      id,
      amount: 125050,
      categoryName: "Продукты",
      categoryIcon: "ShoppingCart",
    });
  });

  it("тип операции должен совпадать с типом категории", async () => {
    const r = await createTransaction(db, "alice", {
      type: "income",
      amount: 100,
      categoryId: await cat("alice", "Продукты"),
      date: "2026-11-10",
      note: null,
    });
    expect(r).toMatchObject({
      ok: false,
      fieldErrors: { categoryId: ["Выберите категорию доходов"] },
    });
  });

  it("нельзя добавить операцию в архивную категорию", async () => {
    const id = await cat("alice", "Одежда");
    await setCategoryArchived(db, "alice", id, true);
    const r = await createTransaction(db, "alice", {
      type: "expense",
      amount: 100,
      categoryId: id,
      date: "2026-11-10",
      note: null,
    });
    expect(r).toMatchObject({
      ok: false,
      error: "Категория в архиве — выберите другую",
    });
  });
});

describe("updateTransaction", () => {
  it("меняет сумму, категорию, дату и тип", async () => {
    const id = await add("alice", await cat("alice", "Продукты"), 100);
    const salary = await cat("alice", "Зарплата", "income");
    const r = await updateTransaction(db, "alice", {
      id,
      type: "income",
      amount: 20000000,
      categoryId: salary,
      date: "2026-11-05",
      note: "Аванс",
    });
    expect(r.ok).toBe(true);
    const [row] = await listTransactions(db, "alice", november).then(
      (l) => l.items,
    );
    expect(row).toMatchObject({
      type: "income",
      amount: 20000000,
      categoryName: "Зарплата",
      note: "Аванс",
    });
  });

  it("операцию в архивной категории можно редактировать, не меняя категорию", async () => {
    const clothes = await cat("alice", "Одежда");
    const id = await add("alice", clothes, 100);
    await setCategoryArchived(db, "alice", clothes, true);

    const same = await updateTransaction(db, "alice", {
      id,
      type: "expense",
      amount: 200,
      categoryId: clothes,
      date: "2026-11-10",
      note: null,
    });
    expect(same.ok).toBe(true);

    const other = await add("alice", await cat("alice", "Продукты"), 100);
    const move = await updateTransaction(db, "alice", {
      id: other,
      type: "expense",
      amount: 100,
      categoryId: clothes,
      date: "2026-11-10",
      note: null,
    });
    expect(move.ok).toBe(false);
  });
});

describe("delete / restore", () => {
  it("удаляет и восстанавливает с тем же id", async () => {
    const id = await add(
      "alice",
      await cat("alice", "Продукты"),
      999,
      "2026-11-10",
      "expense",
      "Хлеб",
    );
    const deleted = await deleteTransaction(db, "alice", id);
    expect(deleted.ok).toBe(true);
    expect((await listTransactions(db, "alice", november)).total).toBe(0);

    const restored = await restoreTransaction(
      db,
      "alice",
      deleted.ok ? deleted.data : (null as never),
    );
    expect(restored).toMatchObject({ ok: true, data: { id } });
    const list = await listTransactions(db, "alice", november);
    expect(list.items[0]).toMatchObject({ id, amount: 999, note: "Хлеб" });
  });

  it("повторное восстановление не создаёт дубликат", async () => {
    const id = await add("alice", await cat("alice", "Продукты"), 999);
    const deleted = await deleteTransaction(db, "alice", id);
    if (!deleted.ok) throw new Error();
    await restoreTransaction(db, "alice", deleted.data);
    expect((await restoreTransaction(db, "alice", deleted.data)).ok).toBe(
      false,
    );
    expect((await listTransactions(db, "alice", november)).total).toBe(1);
  });
});

describe("listTransactions", () => {
  it("сортирует по дате, считает суммы по фильтру и учитывает период", async () => {
    const food = await cat("alice", "Продукты");
    const salary = await cat("alice", "Зарплата", "income");
    await add("alice", food, 1000, "2026-11-02");
    await add("alice", food, 2000, "2026-11-20");
    await add("alice", salary, 50000, "2026-11-05", "income");
    await add("alice", food, 7777, "2026-10-31"); // вне периода

    const list = await listTransactions(db, "alice", november);
    expect(list.items.map((i) => i.date)).toEqual([
      "2026-11-20",
      "2026-11-05",
      "2026-11-02",
    ]);
    expect(list).toMatchObject({
      total: 3,
      income: 50000,
      expense: 3000,
      pageCount: 1,
    });

    const onlyExpense = await listTransactions(db, "alice", november, {
      type: "expense",
    });
    expect(onlyExpense).toMatchObject({ total: 2, income: 0, expense: 3000 });

    const byCategory = await listTransactions(db, "alice", november, {
      categoryId: salary,
    });
    expect(byCategory.total).toBe(1);
  });

  it("ищет по комментарию и категории без учёта регистра (кириллица)", async () => {
    const food = await cat("alice", "Продукты");
    const cafe = await cat("alice", "Кафе и рестораны");
    await add("alice", food, 100, "2026-11-10", "expense", "Молоко и хлеб");
    await add("alice", cafe, 200, "2026-11-11", "expense", "Обед с коллегами");
    await add("alice", food, 300, "2026-11-12", "expense", "Скидка 50% на сыр");

    expect(
      (await listTransactions(db, "alice", november, { q: "молоко" })).total,
    ).toBe(1);
    expect(
      (await listTransactions(db, "alice", november, { q: "ОБЕД" })).total,
    ).toBe(1);
    expect(
      (await listTransactions(db, "alice", november, { q: "кафе" })).total,
    ).toBe(1);
    expect(
      (await listTransactions(db, "alice", november, { q: "продукты" })).total,
    ).toBe(2);
    // % ищется как символ, а не как «что угодно»
    expect(
      (await listTransactions(db, "alice", november, { q: "50%" })).total,
    ).toBe(1);
    expect(
      (await listTransactions(db, "alice", november, { q: "%" })).total,
    ).toBe(1);
  });

  it("делит на страницы по PAGE_SIZE", async () => {
    const food = await cat("alice", "Продукты");
    for (let i = 0; i < PAGE_SIZE + 5; i++) await add("alice", food, 100 + i);
    const p1 = await listTransactions(db, "alice", november, {}, 1);
    const p2 = await listTransactions(db, "alice", november, {}, 2);
    expect(p1.items).toHaveLength(PAGE_SIZE);
    expect(p2.items).toHaveLength(5);
    expect(p1.pageCount).toBe(2);
    expect(new Set([...p1.items, ...p2.items].map((i) => i.id)).size).toBe(
      PAGE_SIZE + 5,
    );
  });
});

describe("изоляция данных между пользователями", () => {
  it("чужие операции не видны", async () => {
    await add("bob", await cat("bob", "Продукты"), 100000);
    const alice = await listTransactions(db, "alice", november);
    expect(alice).toMatchObject({ total: 0, expense: 0 });
  });

  it("нельзя добавить операцию в чужую категорию", async () => {
    const r = await createTransaction(db, "alice", {
      type: "expense",
      amount: 100,
      categoryId: await cat("bob", "Продукты"),
      date: "2026-11-10",
      note: null,
    });
    expect(r.ok).toBe(false);
    expect((await listTransactions(db, "bob", november)).total).toBe(0);
  });

  it("нельзя изменить, удалить или «восстановить» чужую операцию", async () => {
    const bobFood = await cat("bob", "Продукты");
    const id = await add("bob", bobFood, 100000);

    const upd = await updateTransaction(db, "alice", {
      id,
      type: "expense",
      amount: 1,
      categoryId: await cat("alice", "Продукты"),
      date: "2026-11-10",
      note: null,
    });
    expect(upd).toMatchObject({ ok: false, error: "Операция не найдена" });
    expect(await deleteTransaction(db, "alice", id)).toMatchObject({
      ok: false,
    });

    // «восстановление» с чужим id и чужой категорией
    const fake = await restoreTransaction(db, "alice", {
      id: "zzzzzzzzzzzzzzzzzzzzzzzz",
      type: "expense",
      amount: 1,
      categoryId: bobFood,
      date: "2026-11-10",
      note: null,
    });
    expect(fake.ok).toBe(false);

    const bob = await listTransactions(db, "bob", november);
    expect(bob.items[0]).toMatchObject({ id, amount: 100000 });
  });
});

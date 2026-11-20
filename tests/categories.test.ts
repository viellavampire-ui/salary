import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import {
  MAX_CATEGORIES_PER_TYPE,
  createCategory,
  listCategoriesWithTotals,
  setCategoryArchived,
  updateCategory,
} from "@/server/data/categories";
import { createTestDb, createUser } from "./helpers/db";

let db: Database;

const november = { from: "2026-11-01", to: "2026-11-30" };

async function categoryId(userId: string, name: string, type = "expense") {
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

async function addTx(
  userId: string,
  categoryId: string,
  amount: number,
  date: string,
) {
  await db.insert(schema.transactions).values({
    userId,
    categoryId,
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

describe("createCategory", () => {
  it("создаёт категорию в конце списка", async () => {
    const r = await createCategory(db, "alice", {
      name: "Кофе",
      type: "expense",
      icon: "Coffee",
      color: "amber",
    });
    expect(r.ok).toBe(true);

    const rows = await listCategoriesWithTotals(db, "alice", november);
    const expense = rows.filter((c) => c.type === "expense");
    expect(expense.at(-1)?.name).toBe("Кофе");
  });

  it("не даёт создать дубликат без учёта регистра (кириллица)", async () => {
    const r = await createCategory(db, "alice", {
      name: "  продукты ",
      type: "expense",
      icon: "Coffee",
      color: "amber",
    });
    expect(r).toMatchObject({
      ok: false,
      fieldErrors: { name: ["Категория с таким названием уже есть"] },
    });
  });

  it("одинаковое название допустимо для другого типа и другого пользователя", async () => {
    expect(
      (
        await createCategory(db, "alice", {
          name: "Продукты",
          type: "income",
          icon: "Coffee",
          color: "amber",
        })
      ).ok,
    ).toBe(true);
  });

  it("подсказывает восстановить архивную категорию", async () => {
    await setCategoryArchived(
      db,
      "alice",
      await categoryId("alice", "Одежда"),
      true,
    );
    const r = await createCategory(db, "alice", {
      name: "Одежда",
      type: "expense",
      icon: "Shirt",
      color: "violet",
    });
    expect(r).toMatchObject({
      ok: false,
      error: "Такая категория есть в архиве — восстановите её",
    });
  });

  it(`ограничивает число категорий одного типа (${MAX_CATEGORIES_PER_TYPE})`, async () => {
    // у alice уже 5 стандартных категорий доходов
    for (let i = 0; i < MAX_CATEGORIES_PER_TYPE - 5; i++) {
      const r = await createCategory(db, "alice", {
        name: `Доход ${i}`,
        type: "income",
        icon: "Coins",
        color: "teal",
      });
      expect(r.ok).toBe(true);
    }
    const r = await createCategory(db, "alice", {
      name: "Лишняя",
      type: "income",
      icon: "Coins",
      color: "teal",
    });
    expect(r.ok).toBe(false);
  });
});

describe("updateCategory", () => {
  it("меняет название, иконку и цвет", async () => {
    const id = await categoryId("alice", "Продукты");
    const r = await updateCategory(db, "alice", {
      id,
      name: "Еда",
      icon: "Pizza",
      color: "rose",
    });
    expect(r.ok).toBe(true);
    const [row] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, id));
    expect(row).toMatchObject({
      name: "Еда",
      icon: "Pizza",
      color: "rose",
      type: "expense",
    });
  });

  it("можно сохранить категорию с тем же названием (сама с собой не конфликтует)", async () => {
    const id = await categoryId("alice", "Продукты");
    expect(
      (
        await updateCategory(db, "alice", {
          id,
          name: "ПРОДУКТЫ",
          icon: "Pizza",
          color: "rose",
        })
      ).ok,
    ).toBe(true);
  });

  it("не даёт переименовать в название соседней категории", async () => {
    const id = await categoryId("alice", "Продукты");
    const r = await updateCategory(db, "alice", {
      id,
      name: "Жильё",
      icon: "Pizza",
      color: "rose",
    });
    expect(r.ok).toBe(false);
  });
});

describe("setCategoryArchived", () => {
  it("архивирует и восстанавливает", async () => {
    const id = await categoryId("alice", "Одежда");
    expect((await setCategoryArchived(db, "alice", id, true)).ok).toBe(true);
    let rows = await listCategoriesWithTotals(db, "alice", november);
    expect(rows.find((c) => c.id === id)?.isArchived).toBe(true);

    expect((await setCategoryArchived(db, "alice", id, false)).ok).toBe(true);
    rows = await listCategoriesWithTotals(db, "alice", november);
    expect(rows.find((c) => c.id === id)?.isArchived).toBe(false);
  });

  it("не даёт архивировать последнюю активную категорию типа", async () => {
    const income = (
      await listCategoriesWithTotals(db, "alice", november)
    ).filter((c) => c.type === "income");
    for (const c of income.slice(1)) {
      expect((await setCategoryArchived(db, "alice", c.id, true)).ok).toBe(
        true,
      );
    }
    const r = await setCategoryArchived(db, "alice", income[0].id, true);
    expect(r).toMatchObject({
      ok: false,
      error: "Нужна хотя бы одна активная категория доходов",
    });
  });
});

describe("listCategoriesWithTotals", () => {
  it("считает сумму и число операций только за период", async () => {
    const food = await categoryId("alice", "Продукты");
    await addTx("alice", food, 150000, "2026-11-01");
    await addTx("alice", food, 50050, "2026-11-30");
    await addTx("alice", food, 999900, "2026-10-31"); // прошлый месяц
    await addTx("alice", food, 777700, "2026-12-01"); // следующий месяц

    const row = (await listCategoriesWithTotals(db, "alice", november)).find(
      (c) => c.id === food,
    );
    expect(row).toMatchObject({ total: 200050, count: 2 });
  });

  it("категория без операций — ноль", async () => {
    const rows = await listCategoriesWithTotals(db, "alice", november);
    expect(rows.every((c) => c.total === 0 && c.count === 0)).toBe(true);
    expect(rows).toHaveLength(15);
  });
});

describe("изоляция данных между пользователями", () => {
  it("видны только свои категории и суммы", async () => {
    const bobFood = await categoryId("bob", "Продукты");
    await addTx("bob", bobFood, 100000, "2026-11-10");

    const alice = await listCategoriesWithTotals(db, "alice", november);
    expect(alice).toHaveLength(15);
    expect(alice.some((c) => c.id === bobFood)).toBe(false);
    expect(alice.reduce((s, c) => s + c.total, 0)).toBe(0);
  });

  it("нельзя изменить или архивировать чужую категорию", async () => {
    const bobFood = await categoryId("bob", "Продукты");

    const update = await updateCategory(db, "alice", {
      id: bobFood,
      name: "Взлом",
      icon: "Coffee",
      color: "rose",
    });
    expect(update).toMatchObject({ ok: false, error: "Категория не найдена" });

    const archive = await setCategoryArchived(db, "alice", bobFood, true);
    expect(archive).toMatchObject({ ok: false, error: "Категория не найдена" });

    const [row] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, bobFood));
    expect(row).toMatchObject({ name: "Продукты", isArchived: false });
  });
});

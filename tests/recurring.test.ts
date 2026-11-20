import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { setCategoryArchived } from "@/server/data/categories";
import {
  createRecurring,
  deleteRecurring,
  listRecurring,
  setRecurringPaused,
  syncRecurring,
  updateRecurring,
} from "@/server/data/recurring";
import { listTransactions } from "@/server/data/transactions";
import { createTestDb, createUser } from "./helpers/db";

let db: Database;
const all = { from: "2000-01-01", to: "2030-12-31" };

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

async function rent(userId = "alice", startDate = "2026-09-05", extra = {}) {
  const r = await createRecurring(db, userId, {
    type: "expense",
    amount: 4500000,
    categoryId: await cat(userId, "Жильё"),
    frequency: "monthly",
    startDate,
    endDate: null,
    note: "Аренда",
    ...extra,
  });
  if (!r.ok) throw new Error(r.error);
  return r.data.id;
}

const dates = async (userId = "alice") =>
  (await listTransactions(db, userId, all, {}, 1)).items
    .map((t) => t.date)
    .sort();

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, "alice");
  await createUser(db, "bob");
});

describe("syncRecurring", () => {
  it("догоняет прошедшие даты, а повторная синхронизация ничего не дублирует", async () => {
    await rent();
    expect(await syncRecurring(db, "alice", "2026-11-20")).toMatchObject({
      created: 3,
    });
    expect(await dates()).toEqual(["2026-09-05", "2026-10-05", "2026-11-05"]);

    expect(await syncRecurring(db, "alice", "2026-11-20")).toMatchObject({
      created: 0,
    });
    expect(await syncRecurring(db, "alice", "2026-12-05")).toMatchObject({
      created: 1,
    });
    expect(await dates()).toHaveLength(4);
  });

  it("операции получают сумму, категорию, комментарий и ссылку на правило", async () => {
    const id = await rent();
    await syncRecurring(db, "alice", "2026-09-05");
    const [t] = (await listTransactions(db, "alice", all)).items;
    expect(t).toMatchObject({
      amount: 4500000,
      categoryName: "Жильё",
      note: "Аренда",
      type: "expense",
    });
    const [row] = await db.select().from(schema.transactions);
    expect(row.recurringId).toBe(id);
  });

  it("возвращает категории расходов — для проверки бюджетов", async () => {
    await rent();
    const salary = await cat("alice", "Зарплата", "income");
    await createRecurring(db, "alice", {
      type: "income",
      amount: 1,
      categoryId: salary,
      frequency: "monthly",
      startDate: "2026-11-01",
      endDate: null,
      note: null,
    });
    const r = await syncRecurring(db, "alice", "2026-11-20");
    expect(r.created).toBe(4);
    expect(r.expenseCategoryIds).toEqual([await cat("alice", "Жильё")]);
  });

  it("одновременные синхронизации не создают дублей (уникальный индекс)", async () => {
    await rent();
    const [a, b] = await Promise.all([
      syncRecurring(db, "alice", "2026-11-20"),
      syncRecurring(db, "alice", "2026-11-20"),
    ]);
    expect(a.created + b.created).toBe(3);
    expect(await dates()).toHaveLength(3);
  });

  it("дата окончания и лимит догоняния", async () => {
    await rent("alice", "2026-09-05", { endDate: "2026-10-31" });
    await syncRecurring(db, "alice", "2027-06-01");
    expect(await dates()).toEqual(["2026-09-05", "2026-10-05"]);

    const r = await syncRecurring(db, "bob", "2026-11-20", 2);
    expect(r.created).toBe(0);
    await rent("bob", "2026-01-05");
    expect((await syncRecurring(db, "bob", "2026-11-20", 2)).created).toBe(2);
    expect((await syncRecurring(db, "bob", "2026-11-20", 100)).created).toBe(9);
  });

  it("архивная категория: правило ждёт и догоняет после восстановления", async () => {
    await rent();
    const home = await cat("alice", "Жильё");
    await setCategoryArchived(db, "alice", home, true);
    expect((await syncRecurring(db, "alice", "2026-11-20")).created).toBe(0);
    await setCategoryArchived(db, "alice", home, false);
    expect((await syncRecurring(db, "alice", "2026-11-20")).created).toBe(3);
  });
});

describe("пауза, изменение, удаление", () => {
  it("на паузе не создаёт; после возобновления пропущенное не догоняет", async () => {
    const id = await rent();
    await syncRecurring(db, "alice", "2026-09-10"); // сентябрь
    await setRecurringPaused(db, "alice", id, true, "2026-09-10");
    expect((await syncRecurring(db, "alice", "2026-11-20")).created).toBe(0);
    await setRecurringPaused(db, "alice", id, false, "2026-11-20");
    expect((await syncRecurring(db, "alice", "2026-11-20")).created).toBe(0);
    expect((await syncRecurring(db, "alice", "2026-12-05")).created).toBe(1);
    expect(await dates()).toEqual(["2026-09-05", "2026-12-05"]);
  });

  it("смена суммы — только для будущих операций", async () => {
    const id = await rent();
    await syncRecurring(db, "alice", "2026-11-20");
    const [r] = await listRecurring(db, "alice");
    await updateRecurring(
      db,
      "alice",
      { ...r, id, amount: 5000000, endDate: null, note: "Аренда" },
      "2026-11-20",
    );
    await syncRecurring(db, "alice", "2026-12-05");
    const amounts = (await listTransactions(db, "alice", all)).items.map(
      (t) => [t.date, t.amount],
    );
    expect(amounts).toContainEqual(["2026-11-05", 4500000]);
    expect(amounts).toContainEqual(["2026-12-05", 5000000]);
  });

  it("смена расписания не догоняет прошедшие даты нового расписания", async () => {
    const id = await rent();
    await syncRecurring(db, "alice", "2026-11-20");
    const [r] = await listRecurring(db, "alice");
    await updateRecurring(
      db,
      "alice",
      {
        ...r,
        id,
        frequency: "weekly",
        startDate: "2026-09-01",
        endDate: null,
        note: null,
      },
      "2026-11-20",
    );
    expect((await syncRecurring(db, "alice", "2026-11-20")).created).toBe(0);
    expect((await syncRecurring(db, "alice", "2026-11-24")).created).toBe(1); // вт 24.11
  });

  it("удаление правила оставляет созданные операции", async () => {
    const id = await rent();
    await syncRecurring(db, "alice", "2026-11-20");
    expect((await deleteRecurring(db, "alice", id)).ok).toBe(true);
    expect(await dates()).toHaveLength(3);
    const rows = await db.select().from(schema.transactions);
    expect(rows.every((t) => t.recurringId === null)).toBe(true);
  });

  it("тип правила должен совпадать с типом категории", async () => {
    const r = await createRecurring(db, "alice", {
      type: "income",
      amount: 1,
      categoryId: await cat("alice", "Жильё"),
      frequency: "monthly",
      startDate: "2026-11-01",
      endDate: null,
      note: null,
    });
    expect(r.ok).toBe(false);
  });
});

describe("изоляция данных между пользователями", () => {
  it("чужие правила не видны, не меняются и не синхронизируются", async () => {
    const bobRule = await rent("bob");
    expect(await listRecurring(db, "alice")).toEqual([]);
    expect((await syncRecurring(db, "alice", "2026-11-20")).created).toBe(0);
    expect(
      (await setRecurringPaused(db, "alice", bobRule, true, "2026-11-20")).ok,
    ).toBe(false);
    expect((await deleteRecurring(db, "alice", bobRule)).ok).toBe(false);

    const [r] = await listRecurring(db, "bob");
    const upd = await updateRecurring(
      db,
      "alice",
      {
        ...r,
        id: bobRule,
        categoryId: await cat("alice", "Жильё"),
        endDate: null,
        note: null,
      },
      "2026-11-20",
    );
    expect(upd.ok).toBe(false);

    // нельзя создать правило в чужой категории
    const foreign = await createRecurring(db, "alice", {
      type: "expense",
      amount: 1,
      categoryId: await cat("bob", "Жильё"),
      frequency: "monthly",
      startDate: "2026-11-01",
      endDate: null,
      note: null,
    });
    expect(foreign.ok).toBe(false);
    expect((await syncRecurring(db, "bob", "2026-11-20")).created).toBe(3);
    expect(await dates("alice")).toEqual([]);
  });
});

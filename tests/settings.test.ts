import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { CSV_BOM, csvAmount, csvField, toCsv } from "@/lib/csv";
import {
  hasPasswordLogin,
  listForExport,
  updateSettings,
} from "@/server/data/settings";
import { createTestDb, createUser } from "./helpers/db";

let db: Database;

async function catId(userId: string, name: string) {
  const rows = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.userId, userId));
  return rows.find((c) => c.name === name)!;
}

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, "alice");
  await createUser(db, "bob");
});

describe("CSV", () => {
  it("csvAmount — запятая, знак, без разделителей тысяч", () => {
    expect(csvAmount(123456)).toBe("1234,56");
    expect(csvAmount(-5)).toBe("-0,05");
    expect(csvAmount(100000000)).toBe("1000000,00");
  });

  it("csvField экранирует ; кавычки и переводы строк", () => {
    expect(csvField("Обед")).toBe("Обед");
    expect(csvField('Кафе "Уют"; ужин')).toBe('"Кафе ""Уют""; ужин"');
    expect(csvField("строка 1\nстрока 2")).toBe('"строка 1\nстрока 2"');
  });

  it("csvField защищает от формул (CSV-инъекция)", () => {
    expect(csvField('=HYPERLINK("http://evil")')).toBe(
      '"\'=HYPERLINK(""http://evil"")"',
    );
    expect(csvField("+7 999")).toBe("'+7 999");
    expect(csvField("-скидка")).toBe("'-скидка");
    expect(csvField("@me")).toBe("'@me");
  });

  it("toCsv — BOM, заголовок, расходы с минусом, CRLF", () => {
    const csv = toCsv(
      [
        {
          date: "2026-11-01",
          type: "income",
          categoryName: "Зарплата",
          amount: 20000000,
          note: null,
        },
        {
          date: "2026-11-02",
          type: "expense",
          categoryName: "Продукты",
          amount: 125050,
          note: "Хлеб; молоко",
        },
      ],
      "RUB",
    );
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Дата;Тип;Категория;Сумма;Валюта;Комментарий",
      "2026-11-01;Доход;Зарплата;200000,00;RUB;",
      '2026-11-02;Расход;Продукты;-1250,50;RUB;"Хлеб; молоко"',
      "",
    ]);
  });
});

describe("settings data", () => {
  it("updateSettings меняет валюту и день начала месяца", async () => {
    await updateSettings(db, "alice", { currency: "KZT", monthStartDay: 10 });
    const [u] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, "alice"));
    expect(u).toMatchObject({ currency: "KZT", monthStartDay: 10 });
    const [b] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, "bob"));
    expect(b).toMatchObject({ currency: "RUB", monthStartDay: 1 });
  });

  it("hasPasswordLogin различает вход по паролю и через Google", async () => {
    await db.insert(schema.account).values([
      {
        id: "a1",
        accountId: "alice",
        providerId: "credential",
        userId: "alice",
        password: "hash",
      },
      { id: "b1", accountId: "g-123", providerId: "google", userId: "bob" },
    ]);
    expect(await hasPasswordLogin(db, "alice")).toBe(true);
    expect(await hasPasswordLogin(db, "bob")).toBe(false);
  });

  it("listForExport — только свои операции, по дате, с фильтром периода", async () => {
    const food = await catId("alice", "Продукты");
    const bobFood = await catId("bob", "Продукты");
    await db.insert(schema.transactions).values([
      {
        userId: "alice",
        categoryId: food.id,
        type: "expense",
        amount: 2,
        date: "2026-11-10",
      },
      {
        userId: "alice",
        categoryId: food.id,
        type: "expense",
        amount: 1,
        date: "2026-10-01",
      },
      {
        userId: "bob",
        categoryId: bobFood.id,
        type: "expense",
        amount: 999,
        date: "2026-11-10",
      },
    ]);
    expect(
      (await listForExport(db, "alice", null)).map((r) => r.amount),
    ).toEqual([1, 2]);
    expect(
      (
        await listForExport(db, "alice", {
          from: "2026-11-01",
          to: "2026-11-30",
        })
      ).map((r) => r.amount),
    ).toEqual([2]);
  });

  it("удаление пользователя каскадом удаляет все его данные (и только их)", async () => {
    const food = await catId("alice", "Продукты");
    await db.insert(schema.transactions).values({
      userId: "alice",
      categoryId: food.id,
      type: "expense",
      amount: 1,
      date: "2026-11-01",
    });
    await db
      .insert(schema.budgets)
      .values({ userId: "alice", categoryId: food.id, amount: 100 });

    await db.delete(schema.user).where(eq(schema.user.id, "alice"));

    const left = async (
      t:
        | typeof schema.categories
        | typeof schema.transactions
        | typeof schema.budgets,
    ) => (await db.select().from(t).where(eq(t.userId, "alice"))).length;
    expect(await left(schema.categories)).toBe(0);
    expect(await left(schema.transactions)).toBe(0);
    expect(await left(schema.budgets)).toBe(0);
    expect(
      (
        await db
          .select()
          .from(schema.categories)
          .where(eq(schema.categories.userId, "bob"))
      ).length,
    ).toBe(15);
  });
});

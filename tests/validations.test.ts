import { describe, expect, it } from "vitest";

import {
  budgetSchema,
  categorySchema,
  fieldErrors,
  registerSchema,
  safeNextPath,
  settingsSchema,
  transactionSchema,
  transactionUpdateSchema,
} from "@/lib/validations";

describe("safeNextPath", () => {
  it("пропускает внутренние пути", () => {
    expect(safeNextPath("/transactions?type=expense")).toBe(
      "/transactions?type=expense",
    );
  });

  it.each([
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
  ])("заменяет %s на /dashboard", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });
});

describe("registerSchema", () => {
  it("требует пароль не короче 8 символов", () => {
    const r = registerSchema.safeParse({
      name: "Анна",
      email: "a@b.ru",
      password: "1234567",
    });
    expect(r.success).toBe(false);
  });

  it("принимает корректные данные", () => {
    const r = registerSchema.safeParse({
      name: " Анна ",
      email: "a@b.ru",
      password: "12345678",
    });
    expect(r.success).toBe(true);
    expect(r.data?.name).toBe("Анна");
  });
});

describe("transactionSchema", () => {
  const valid = {
    type: "expense",
    amount: "1 250,50",
    categoryId: "na2l3i7aq99t5pza29j6z5hk",
    date: "2026-11-20",
    note: "  Продукты на неделю  ",
  };

  it("переводит сумму в копейки и чистит комментарий", () => {
    const r = transactionSchema.parse(valid);
    expect(r.amount).toBe(125050);
    expect(r.note).toBe("Продукты на неделю");
  });

  it("пустой комментарий → null", () => {
    expect(transactionSchema.parse({ ...valid, note: "   " }).note).toBeNull();
    expect(
      transactionSchema.parse({ ...valid, note: undefined }).note,
    ).toBeNull();
  });

  it.each([
    ["", "Введите сумму"],
    ["abc", "Введите сумму числом, например 1 250,50"],
    ["0", "Сумма должна быть больше нуля"],
    ["1000000000000", "Слишком большая сумма"],
    ["10000000000000", "Введите сумму числом, например 1 250,50"],
    ["1000000000", "Слишком большая сумма"],
  ])("сумма «%s» → %s", (amount, message) => {
    const r = transactionSchema.safeParse({ ...valid, amount });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!).amount).toEqual([message]);
  });

  it.each([
    ["2026-02-30", "Некорректная дата"],
    ["1999-12-31", "Дата не может быть раньше 2000 года"],
    ["2099-01-01", "Дата не может быть больше чем через год"],
  ])("дата %s отклоняется", (date, message) => {
    const r = transactionSchema.safeParse({ ...valid, date });
    expect(fieldErrors(r.error!).date).toContain(message);
  });

  it("проверяет тип, категорию и длину комментария", () => {
    const r = transactionSchema.safeParse({
      ...valid,
      type: "gift",
      categoryId: "../etc",
      note: "x".repeat(201),
    });
    const errors = fieldErrors(r.error!);
    expect(errors.type).toEqual(["Выберите доход или расход"]);
    expect(errors.categoryId).toEqual(["Выберите категорию"]);
    expect(errors.note).toEqual(["Комментарий не длиннее 200 символов"]);
  });

  it("transactionUpdateSchema требует id", () => {
    expect(transactionUpdateSchema.safeParse(valid).success).toBe(false);
    expect(
      transactionUpdateSchema.safeParse({
        ...valid,
        id: "c8p4e8yjo27kxasj3nz88592",
      }).success,
    ).toBe(true);
  });
});

describe("categorySchema", () => {
  it("принимает иконку и цвет из списка", () => {
    const r = categorySchema.parse({
      name: " Кафе ",
      type: "expense",
      icon: "Coffee",
      color: "amber",
    });
    expect(r.name).toBe("Кафе");
  });

  it("отклоняет неизвестные иконку и цвет", () => {
    const r = categorySchema.safeParse({
      name: "Кафе",
      type: "expense",
      icon: "Rocket",
      color: "pink",
    });
    const errors = fieldErrors(r.error!);
    expect(errors.icon).toEqual(["Выберите иконку"]);
    expect(errors.color).toEqual(["Выберите цвет"]);
  });

  it("ограничивает длину названия", () => {
    const r = categorySchema.safeParse({
      name: "x".repeat(41),
      type: "income",
      icon: "Gift",
      color: "rose",
    });
    expect(fieldErrors(r.error!).name).toEqual([
      "Название не длиннее 40 символов",
    ]);
  });
});

describe("budgetSchema и settingsSchema", () => {
  it("бюджет: сумма в копейках", () => {
    expect(
      budgetSchema.parse({
        categoryId: "na2l3i7aq99t5pza29j6z5hk",
        amount: "10 000",
      }).amount,
    ).toBe(1000000);
  });

  it("настройки: валюта из списка, день 1–28 (строка из формы тоже подходит)", () => {
    expect(
      settingsSchema.parse({ currency: "KZT", monthStartDay: "10" }),
    ).toEqual({
      currency: "KZT",
      monthStartDay: 10,
    });
    const r = settingsSchema.safeParse({ currency: "XXX", monthStartDay: 31 });
    const errors = fieldErrors(r.error!);
    expect(errors.currency).toEqual(["Выберите валюту"]);
    expect(errors.monthStartDay).toEqual(["Укажите число от 1 до 28"]);
  });
});

import { describe, expect, it } from "vitest";

import { registerSchema, safeNextPath } from "@/lib/validations";

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

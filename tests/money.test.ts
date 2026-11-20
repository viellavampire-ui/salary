import { describe, expect, it } from "vitest";

import {
  MAX_AMOUNT_MINOR,
  formatCompact,
  formatMoney,
  formatPercent,
  formatSigned,
  fromMinor,
  isCurrencyCode,
  minorToInput,
  toMinor,
} from "@/lib/money";

// Intl ставит неразрывные пробелы — сравниваем, заменив их на обычные
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("toMinor", () => {
  it.each([
    ["100", 10000],
    ["1 234,56", 123456],
    ["1234.56", 123456],
    ["1 234,5", 123450],
    ["0,5", 50],
    ["0,05", 5],
    ["  42  ", 4200],
    ["1234,", 123400],
    ["007", 700],
    ["0", 0],
    ["999999999999,99", 99999999999999],
    ["1 000 000 000 000", 100000000000000],
  ])("«%s» → %i", (input, expected) => {
    expect(toMinor(input)).toBe(expected);
  });

  it.each([
    "",
    " ",
    "abc",
    "1,234.56",
    "1.2.3",
    "12,345",
    "-5",
    "+5",
    "1e5",
    ",5",
    "10 000 000 000 000",
  ])("«%s» → null", (input) => {
    expect(toMinor(input)).toBeNull();
  });

  it("не теряет копейки на классических float-ловушках", () => {
    expect(toMinor("0,1")! + toMinor("0,2")!).toBe(toMinor("0,3"));
    expect(toMinor("19,99")).toBe(1999);
    expect(toMinor("1,15")).toBe(115);
  });
});

describe("fromMinor / minorToInput", () => {
  it("переводит копейки в рубли", () => {
    expect(fromMinor(123456)).toBe(1234.56);
  });

  it("готовит значение для поля ввода", () => {
    expect(minorToInput(123456)).toBe("1234,56");
    expect(minorToInput(100000)).toBe("1000");
    expect(minorToInput(5)).toBe("0,05");
    expect(toMinor(minorToInput(MAX_AMOUNT_MINOR))).toBe(MAX_AMOUNT_MINOR);
  });
});

describe("formatMoney", () => {
  it("целые суммы — без копеек", () => {
    expect(plain(formatMoney(24530000))).toBe("245 300 ₽");
  });

  it("с копейками — два знака", () => {
    expect(plain(formatMoney(123456))).toBe("1 234,56 ₽");
    expect(plain(formatMoney(5))).toBe("0,05 ₽");
  });

  it("отрицательные — со знаком минус U+2212", () => {
    expect(plain(formatMoney(-15890000))).toBe("−158 900 ₽");
  });

  it("sign: always / never", () => {
    expect(plain(formatMoney(100, "RUB", { sign: "always" }))).toBe("+1 ₽");
    expect(plain(formatMoney(-100, "RUB", { sign: "never" }))).toBe("1 ₽");
    expect(plain(formatMoney(0, "RUB", { sign: "always" }))).toBe("0 ₽");
  });

  it("показывает символы других валют", () => {
    expect(plain(formatMoney(500, "USD"))).toBe("5 $");
    expect(plain(formatMoney(500, "EUR"))).toBe("5 €");
    expect(plain(formatMoney(500, "KZT"))).toBe("5 ₸");
  });
});

describe("formatSigned", () => {
  it("доход с плюсом, расход с минусом", () => {
    expect(plain(formatSigned(20000000, "income"))).toBe("+200 000 ₽");
    expect(plain(formatSigned(120000, "expense"))).toBe("−1 200 ₽");
    expect(plain(formatSigned(-120000, "expense"))).toBe("−1 200 ₽");
  });
});

describe("formatCompact", () => {
  it.each([
    [0, "0"],
    [95000, "950"],
    [99960, "1K"],
    [4500000, "45K"],
    [4530000, "45,3K"],
    [12345600, "123K"],
    [99995000, "1M"],
    [120000000, "1,2M"],
    [-4500000, "−45K"],
    [300000000000, "3B"],
  ])("%i коп. → %s", (minor, expected) => {
    expect(formatCompact(minor)).toBe(expected);
  });
});

describe("прочее", () => {
  it("formatPercent", () => {
    expect(plain(formatPercent(0.3456))).toBe("35 %");
    expect(plain(formatPercent(-0.04))).toBe("−4 %");
  });

  it("isCurrencyCode", () => {
    expect(isCurrencyCode("RUB")).toBe(true);
    expect(isCurrencyCode("XXX")).toBe(false);
  });
});

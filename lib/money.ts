/**
 * Работа с деньгами (docs/SPEC.md §11).
 * Все суммы в приложении — целые числа в минимальных единицах валюты
 * (копейках, центах). Дробные числа (float) для денег не используются.
 */

/** Валюты, которые можно выбрать в настройках. У всех 2 знака после запятой. */
export const SUPPORTED_CURRENCIES = [
  { code: "RUB", label: "Российский рубль" },
  { code: "USD", label: "Доллар США" },
  { code: "EUR", label: "Евро" },
  { code: "KZT", label: "Казахстанский тенге" },
  { code: "BYN", label: "Белорусский рубль" },
  { code: "UAH", label: "Украинская гривна" },
  { code: "UZS", label: "Узбекский сум" },
  { code: "GEL", label: "Грузинский лари" },
  { code: "AMD", label: "Армянский драм" },
  { code: "TRY", label: "Турецкая лира" },
  { code: "CNY", label: "Китайский юань" },
  { code: "GBP", label: "Фунт стерлингов" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code) as [
  CurrencyCode,
  ...CurrencyCode[],
];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(value);
}

/** Максимальная сумма одной операции: 999 999 999,99 */
export const MAX_AMOUNT_MINOR = 99_999_999_999;

const MINUS = "−"; // «−», а не дефис (docs/design.md §3)

/**
 * Строка от пользователя → копейки.
 * Принимает «1 234,56», «1234.56», «1 234», «0,5». Пробелы (в т.ч. неразрывные)
 * считаются разделителями тысяч, запятая или точка — дробной частью
 * (не больше 2 знаков). Возвращает null, если строку нельзя разобрать.
 * Знак не допускается: тип операции (доход/расход) задаётся отдельно.
 */
export function toMinor(input: string): number | null {
  const s = input.replace(/[\s  ]/g, "");
  const match = /^(\d+)(?:[.,](\d{0,2}))?$/.exec(s);
  if (!match) return null;

  const [, whole, fraction = ""] = match;
  // Отсекаем ведущие нули, чтобы не терять точность на длинных строках
  const wholeDigits = whole.replace(/^0+(?=\d)/, "");
  // 13 цифр × 100 ещё точно помещается в безопасное целое JavaScript;
  // превышение лимита суммы проверяет схема (понятная ошибка «слишком большая»)
  if (wholeDigits.length > 13) return null;

  const minor = Number(wholeDigits) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Копейки → число в основных единицах (для графиков и расчётов на клиенте). */
export function fromMinor(minor: number): number {
  return minor / 100;
}

/** Копейки → строка для поля ввода: 123456 → «1234,56», 100000 → «1000». */
export function minorToInput(minor: number): string {
  const abs = Math.abs(minor);
  const whole = Math.trunc(abs / 100);
  const cents = abs % 100;
  return cents === 0
    ? String(whole)
    : `${whole},${String(cents).padStart(2, "0")}`;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, fractionDigits: 0 | 2) {
  const key = `${currency}:${fractionDigits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, f);
  }
  return f;
}

export type SignDisplay = "auto" | "always" | "never";

/**
 * Копейки → «245 300 ₽», «1 234,56 ₽».
 * Копейки показываются, только если они есть.
 * sign: "auto" — минус только у отрицательных; "always" — «+» у положительных
 * (для доходов); "never" — без знака.
 */
export function formatMoney(
  minor: number,
  currency: string = "RUB",
  { sign = "auto" }: { sign?: SignDisplay } = {},
): string {
  const abs = Math.abs(minor);
  const digits = abs % 100 === 0 ? 0 : 2;
  const body = formatter(currency, digits).format(abs / 100);

  if (sign === "never" || minor === 0) return body;
  if (minor < 0) return `${MINUS}${body}`;
  return sign === "always" ? `+${body}` : body;
}

/** Сумма операции со знаком по её типу: доход «+245 300 ₽», расход «−1 200 ₽». */
export function formatSigned(
  minor: number,
  type: "income" | "expense",
  currency: string = "RUB",
): string {
  return formatMoney(
    type === "expense" ? -Math.abs(minor) : Math.abs(minor),
    currency,
    {
      sign: "always",
    },
  );
}

/**
 * Краткая запись для осей графиков (docs/design.md §8): 950, 45K, 1,2M, 3B.
 * Принимает копейки, валюту не показывает.
 */
export function formatCompact(minor: number): string {
  const value = Math.abs(minor) / 100;
  const sign = minor < 0 ? MINUS : "";
  const units: [number, string][] = [
    [1e3, "K"],
    [1e6, "M"],
    [1e9, "B"],
  ];
  // 1 знак после запятой до 100, дальше — целые
  const round = (n: number) =>
    n < 100 ? Math.round(n * 10) / 10 : Math.round(n);

  let i = -1;
  units.forEach(([size], index) => {
    if (value >= size) i = index;
  });
  if (i === -1) {
    const whole = Math.round(value);
    if (whole < 1000) return `${sign}${whole}`;
    i = 0; // 999,6 → «1K»
  }

  let n = round(value / units[i][0]);
  // 999 950 → не «1000K», а «1M»
  if (n >= 1000 && i < units.length - 1) {
    i += 1;
    n = round(value / units[i][0]);
  }
  return `${sign}${String(n).replace(".", ",")}${units[i][1]}`;
}

/** Доля в процентах без знака: 0.3456 → «35%». */
export function formatPercent(ratio: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  })
    .format(ratio)
    .replace("-", MINUS);
}

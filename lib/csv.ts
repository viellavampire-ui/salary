/**
 * CSV для Excel/Numbers/Google Таблиц в русской локали:
 * разделитель «;», дробная часть через запятую, UTF-8 с BOM (иначе Excel
 * покажет кракозябры), строки через CRLF.
 */
export const CSV_BOM = "﻿";

/**
 * Экранирование поля. Текст пользователя, начинающийся с = + - @ (или
 * табуляции), Excel может выполнить как формулу — такие значения
 * предваряем апострофом (защита от CSV-инъекций).
 */
export function csvField(value: string, { text = true } = {}): string {
  let v = value;
  if (text && /^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Копейки → «1234,56» / «-1234,56» (без пробелов, чтобы Excel понял число). */
export function csvAmount(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.trunc(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

export type ExportRow = {
  date: string;
  type: "income" | "expense";
  categoryName: string;
  amount: number;
  note: string | null;
};

export const CSV_HEADER = [
  "Дата",
  "Тип",
  "Категория",
  "Сумма",
  "Валюта",
  "Комментарий",
];

/** Операции → CSV-текст (с BOM). Расходы — с минусом, доходы — без. */
export function toCsv(rows: ExportRow[], currency: string): string {
  const lines = [CSV_HEADER.join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.date,
        r.type === "income" ? "Доход" : "Расход",
        csvField(r.categoryName),
        csvAmount(r.type === "expense" ? -r.amount : r.amount),
        currency,
        csvField(r.note ?? ""),
      ].join(";"),
    );
  }
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}

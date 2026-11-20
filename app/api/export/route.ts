import { db } from "@/db";
import { auth } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { isISODate } from "@/lib/period";
import { listForExport } from "@/server/data/settings";

/**
 * Выгрузка операций в CSV (docs/SPEC.md §9).
 *   GET /api/export?from=2026-11-01&to=2026-11-30 — за период
 *   GET /api/export                               — за всё время
 * Только для вошедшего пользователя и только его операции.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response("Требуется вход", { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let range: { from: string; to: string } | null = null;
  if (from || to) {
    if (!isISODate(from) || !isISODate(to) || from > to) {
      return new Response("Некорректный период", { status: 400 });
    }
    range = { from, to };
  }

  const rows = await listForExport(db, session.user.id, range);
  const csv = toCsv(rows, session.user.currency);

  const name = range
    ? `salary_${range.from}_${range.to}.csv`
    : "salary_all.csv";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      // личные финансовые данные — не кэшировать нигде
      "Cache-Control": "no-store, private",
    },
  });
}

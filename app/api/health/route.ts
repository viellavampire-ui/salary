import { connection } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * Проверка после деплоя: сайт запущен и база отвечает.
 * Не раскрывает подробностей ошибки — только статус.
 */
export async function GET() {
  // Иначе Next.js выполнит обработчик один раз при сборке и будет отдавать
  // сохранённый ответ — проверка базы должна идти на каждый запрос
  await connection();
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.run(sql`select 1`);
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    console.error("[health]", error);
    return Response.json({ status: "error" }, { status: 503, headers });
  }
}

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

/**
 * Подключение к Turso. Для локальной разработки можно указать
 * TURSO_DATABASE_URL=file:local.db (обычный файл SQLite).
 */
function createDb() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL не задан. Скопируйте .env.example в .env.local и заполните его.",
    );
  }
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });

  // Локальный файл SQLite: WAL — чтение не блокируется записью (например,
  // открытой рядом `pnpm db:studio`), busy_timeout — ждать блокировку, а не
  // сразу падать с SQLITE_BUSY. Запросы идут по одному соединению по очереди,
  // поэтому PRAGMA выполнится раньше первого запроса. Turso это не нужно.
  if (url.startsWith("file:")) {
    void client
      .executeMultiple("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;")
      .catch((error) => console.error("[db] PRAGMA", error));
  }

  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

// Одно подключение на процесс (и между hot-reload в dev)
const globalForDb = globalThis as unknown as { __salaryDb?: Database };

export const db: Database = globalForDb.__salaryDb ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.__salaryDb = db;

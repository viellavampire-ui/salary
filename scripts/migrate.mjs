// Применяет миграции к базе из TURSO_DATABASE_URL. Безопасно запускать
// повторно: уже применённые миграции пропускаются. На Vercel запускается
// при каждой сборке (скрипт vercel-build в package.json).
import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

config({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL не задан — миграции не применены");
  process.exit(1);
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});
try {
  await migrate(drizzle(client), { migrationsFolder: "./db/migrations" });
  console.log(`✓ Миграции применены (${new URL(url).host || "local file"})`);
} catch (error) {
  console.error("✖ Не удалось применить миграции:", error.message);
  process.exit(1);
} finally {
  client.close();
}

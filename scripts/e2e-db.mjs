// Пересоздаёт базу для сквозных тестов (e2e.db) и применяет миграции.
import { rmSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  rmSync(`e2e.db${suffix}`, { force: true });
}
const client = createClient({ url: "file:e2e.db" });
await migrate(drizzle(client), { migrationsFolder: "./db/migrations" });
client.close();
console.log("e2e.db: migrations applied");

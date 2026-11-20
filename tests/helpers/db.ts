import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { seedDefaultCategories } from "@/db/seed";

/** Новая пустая база в памяти со всеми миграциями. */
export async function createTestDb(): Promise<Database> {
  const db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, { migrationsFolder: "./db/migrations" });
  return db;
}

/** Пользователь со стандартными категориями, как после регистрации. */
export async function createUser(db: Database, id: string, seed = true) {
  await db
    .insert(schema.user)
    .values({ id, name: id, email: `${id}@test.local` });
  if (seed) await seedDefaultCategories(db, id);
}

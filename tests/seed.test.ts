import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { seedDefaultCategories } from "@/db/seed";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

let db: Database;

async function createUser(id: string) {
  await db
    .insert(schema.user)
    .values({ id, name: id, email: `${id}@test.local` });
}

beforeEach(async () => {
  db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, { migrationsFolder: "./db/migrations" });
});

describe("seedDefaultCategories", () => {
  it("создаёт стандартные категории расходов и доходов", async () => {
    await createUser("u1");
    await seedDefaultCategories(db, "u1");

    const rows = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.userId, "u1"));

    expect(rows).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(rows.filter((r) => r.type === "expense")).toHaveLength(10);
    expect(rows.filter((r) => r.type === "income")).toHaveLength(5);
  });

  it("не дублирует категории при повторном вызове", async () => {
    await createUser("u1");
    await seedDefaultCategories(db, "u1");
    await seedDefaultCategories(db, "u1");

    const rows = await db.select().from(schema.categories);
    expect(rows).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it("категории разных пользователей не пересекаются", async () => {
    await createUser("u1");
    await createUser("u2");
    await seedDefaultCategories(db, "u1");
    await seedDefaultCategories(db, "u2");

    const u2 = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.userId, "u2"));
    expect(u2).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(u2.every((r) => r.userId === "u2")).toBe(true);
  });
});

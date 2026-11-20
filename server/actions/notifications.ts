"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/dal";
import { markNotificationsRead } from "@/server/data/notifications";

const schema = z.object({
  ids: z
    .array(z.string().regex(/^[a-z0-9]{10,40}$/))
    .max(100)
    .optional(),
});

/** Отметить прочитанными выбранные уведомления или все (ids не передан). */
export async function markNotificationsReadAction(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Некорректный запрос");
  try {
    await markNotificationsRead(db, user.id, parsed.data.ids);
  } catch (error) {
    console.error("[notifications]", error);
    return fail("Не удалось отметить уведомления");
  }
  revalidatePath("/", "layout");
  return ok(undefined);
}

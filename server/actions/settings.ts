"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";

import { db } from "@/db";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/dal";
import {
  changePasswordSchema,
  deleteAccountSchema,
  fieldErrors,
  settingsSchema,
} from "@/lib/validations";
import { hasPasswordLogin, updateSettings } from "@/server/data/settings";

/* Проверка сессии → Zod → изменение → обновление страниц. */

/** Код ошибки Better Auth → понятное сообщение и поле формы. */
function authError(error: unknown): ActionResult<never> | null {
  if (!(error instanceof APIError)) return null;
  const code = (error.body as { code?: string } | undefined)?.code;
  switch (code) {
    case "INVALID_PASSWORD":
      return fail("Неверный пароль", {
        password: ["Неверный пароль"],
        currentPassword: ["Неверный пароль"],
      });
    case "PASSWORD_TOO_SHORT":
      return fail("Пароль должен быть не короче 8 символов");
    case "SESSION_EXPIRED":
      return fail("Для этого действия войдите заново: сессия старше суток");
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return fail("У аккаунта нет пароля — вы входите через Google");
    default:
      return fail(error.message || "Не удалось выполнить действие");
  }
}

export async function updateSettingsAction(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }
  try {
    await updateSettings(db, user.id, parsed.data);
  } catch (error) {
    console.error("[settings]", error);
    return fail("Не удалось сохранить. Попробуйте ещё раз");
  }
  // Валюта и начало месяца влияют на все страницы
  revalidatePath("/", "layout");
  return ok(undefined);
}

export async function changePasswordAction(
  input: unknown,
): Promise<ActionResult<undefined>> {
  await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }
  try {
    const requestHeaders = await headers();
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // не revokeOtherSessions: true — он отзывает и текущую сессию, а
        // страница перерисовывается в этом же запросе со старой cookie
        // и уходит на /login. Выходим со всех устройств, кроме этого:
      },
      headers: requestHeaders,
    });
    await auth.api.revokeOtherSessions({ headers: requestHeaders });
    return ok(undefined);
  } catch (error) {
    const mapped = authError(error);
    if (mapped) {
      // для этой формы ошибка пароля — у поля «текущий пароль»
      if (!mapped.ok && mapped.fieldErrors?.password) {
        return fail(mapped.error, {
          currentPassword: mapped.fieldErrors.password,
        });
      }
      return mapped;
    }
    console.error("[change-password]", error);
    return fail("Не удалось сменить пароль. Попробуйте ещё раз");
  }
}

/**
 * Удаление аккаунта со всеми данными. Нужно ввести «УДАЛИТЬ» и, если есть
 * вход по паролю, сам пароль. Категории, операции и бюджеты удаляются
 * каскадом (проверено тестом), cookie сессии очищается.
 */
export async function deleteAccountAction(
  input: unknown,
): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Проверьте поля формы", fieldErrors(parsed.error));
  }

  const needsPassword = await hasPasswordLogin(db, user.id);
  if (needsPassword && !parsed.data.password) {
    return fail("Введите пароль", { password: ["Введите пароль"] });
  }

  try {
    await auth.api.deleteUser({
      body: needsPassword ? { password: parsed.data.password } : {},
      headers: await headers(),
    });
    return ok(undefined);
  } catch (error) {
    const mapped = authError(error);
    if (mapped) return mapped;
    console.error("[delete-account]", error);
    return fail("Не удалось удалить аккаунт. Попробуйте ещё раз");
  }
}

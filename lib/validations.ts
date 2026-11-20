import { z } from "zod";

import { CATEGORY_COLORS, isCategoryIconName } from "./categories";
import { CURRENCY_CODES, MAX_AMOUNT_MINOR, toMinor } from "./money";
import {
  MAX_MONTH_START_DAY,
  MIN_MONTH_START_DAY,
  addMonths,
  isISODate,
  toISODate,
} from "./period";

// Без компиляции проверок через new Function: строгий CSP (next.config.ts)
// запрещает eval, и даже проба Zod порождала бы нарушение политики.
z.config({ jitless: true });

const email = z
  .string()
  .trim()
  .min(1, "Введите email")
  .pipe(z.email("Некорректный email"));

const password = z
  .string()
  .min(8, "Пароль должен быть не короче 8 символов")
  .max(128, "Пароль слишком длинный");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Введите пароль"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Введите имя").max(60, "Имя слишком длинное"),
  email,
  password,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** Безопасный путь для редиректа после входа: только внутренний. */
export function safeNextPath(next: string | null | undefined) {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return "/dashboard";
  }
  return next;
}

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Новый пароль совпадает с текущим",
    path: ["newPassword"],
  });

/** Слово, которое нужно ввести для удаления аккаунта. */
export const DELETE_CONFIRM_WORD = "УДАЛИТЬ";

export const deleteAccountSchema = z.object({
  confirm: z
    .string()
    .trim()
    .refine((v) => v.toLocaleUpperCase("ru") === DELETE_CONFIRM_WORD, {
      message: `Введите слово ${DELETE_CONFIRM_WORD}`,
    }),
  password: z.string().max(128).optional(),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/* ───────────── Операции, категории, бюджеты, настройки (шаг 7.3) ───────────── */

/** Самая ранняя дата операции. */
export const MIN_TRANSACTION_DATE = "2000-01-01";

const id = (message: string) => z.string().regex(/^[a-z0-9]{10,40}$/, message);

const transactionType = z.enum(["income", "expense"], {
  error: "Выберите доход или расход",
});

/**
 * Сумма из поля ввода → копейки. Принимает «1 234,56», «1234.56».
 * Результат — целое число > 0 и ≤ 999 999 999,99.
 */
export const amountSchema = z
  .string({ error: "Введите сумму" })
  .trim()
  .min(1, "Введите сумму")
  .transform((value, ctx) => {
    const minor = toMinor(value);
    if (minor === null) {
      ctx.addIssue({
        code: "custom",
        message: "Введите сумму числом, например 1 250,50",
      });
      return z.NEVER;
    }
    if (minor <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Сумма должна быть больше нуля",
      });
      return z.NEVER;
    }
    if (minor > MAX_AMOUNT_MINOR) {
      ctx.addIssue({ code: "custom", message: "Слишком большая сумма" });
      return z.NEVER;
    }
    return minor;
  });

/**
 * Дата операции YYYY-MM-DD: существующая дата, не раньше 2000-01-01
 * и не позже чем через год от сегодняшнего дня (момент проверки).
 */
export const transactionDateSchema = z
  .string({ error: "Укажите дату" })
  .refine(isISODate, "Некорректная дата")
  .refine(
    (d) => d >= MIN_TRANSACTION_DATE,
    "Дата не может быть раньше 2000 года",
  )
  .refine(
    (d) => d <= addMonths(toISODate(new Date()), 12),
    "Дата не может быть больше чем через год",
  );

const note = z
  .string()
  .trim()
  .max(200, "Комментарий не длиннее 200 символов")
  .optional()
  .transform((v) => (v ? v : null));

export const transactionSchema = z.object({
  type: transactionType,
  amount: amountSchema,
  categoryId: id("Выберите категорию"),
  date: transactionDateSchema,
  note,
});

export const transactionUpdateSchema = transactionSchema.extend({
  id: id("Операция не найдена"),
});

/**
 * Копия удалённой операции для «Отменить». Приходит с клиента, поэтому
 * проверяется так же строго, как новая операция (сумма — уже в копейках).
 */
export const transactionSnapshotSchema = z.object({
  id: id("Операция не найдена"),
  type: transactionType,
  amount: z.number().int().positive().max(MAX_AMOUNT_MINOR),
  categoryId: id("Выберите категорию"),
  date: z.string().refine(isISODate, "Некорректная дата"),
  note: z.string().max(200).nullable(),
});

/** Фильтры списка операций из URL. Некорректные значения просто игнорируются. */
export const transactionFiltersSchema = z.object({
  type: transactionType.optional().catch(undefined),
  category: id("").optional().catch(undefined),
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((v) => v || undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});

export const categorySchema = z.object({
  name: z
    .string({ error: "Введите название" })
    .trim()
    .min(1, "Введите название")
    .max(40, "Название не длиннее 40 символов"),
  type: transactionType,
  icon: z.string().refine(isCategoryIconName, "Выберите иконку"),
  color: z.enum(CATEGORY_COLORS, { error: "Выберите цвет" }),
});

export const categoryUpdateSchema = categorySchema
  .omit({ type: true })
  .extend({ id: id("Категория не найдена") });

export const budgetSchema = z.object({
  categoryId: id("Выберите категорию"),
  amount: amountSchema,
});

export const settingsSchema = z.object({
  currency: z.enum(CURRENCY_CODES, { error: "Выберите валюту" }),
  monthStartDay: z.coerce
    .number({ error: "Укажите число от 1 до 28" })
    .int("Укажите число от 1 до 28")
    .min(MIN_MONTH_START_DAY, "Укажите число от 1 до 28")
    .max(MAX_MONTH_START_DAY, "Укажите число от 1 до 28"),
});

/** Поля формы (то, что вводит пользователь) */
export type TransactionFormValues = z.input<typeof transactionSchema>;
/** Проверенные данные (сумма уже в копейках) */
export type TransactionInput = z.output<typeof transactionSchema>;
export type TransactionUpdateInput = z.output<typeof transactionUpdateSchema>;
export type TransactionSnapshot = z.output<typeof transactionSnapshotSchema>;
export type CategoryFormValues = z.input<typeof categorySchema>;
export type CategoryInput = z.output<typeof categorySchema>;
export type CategoryUpdateInput = z.output<typeof categoryUpdateSchema>;
export type BudgetFormValues = z.input<typeof budgetSchema>;
export type BudgetInput = z.output<typeof budgetSchema>;
export type SettingsInput = z.output<typeof settingsSchema>;

/** Ошибки по полям для ответа Server Action: { amount: ["…"], … } */
export function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

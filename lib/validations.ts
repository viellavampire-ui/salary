import { z } from "zod";

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

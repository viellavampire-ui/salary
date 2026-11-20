"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import {
  loginSchema,
  registerSchema,
  safeNextPath,
  type RegisterInput,
} from "@/lib/validations";

type Mode = "login" | "register";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Неверный email или пароль",
  USER_ALREADY_EXISTS: "Пользователь с таким email уже зарегистрирован",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Пользователь с таким email уже зарегистрирован",
  PASSWORD_TOO_SHORT: "Пароль должен быть не короче 8 символов",
  INVALID_EMAIL: "Некорректный email",
};

function errorMessage(error: { code?: string; status?: number } | null) {
  if (!error) return null;
  if (error.code && ERROR_MESSAGES[error.code])
    return ERROR_MESSAGES[error.code];
  if (error.status === 429)
    return "Слишком много попыток. Попробуйте через минуту";
  return "Что-то пошло не так. Попробуйте ещё раз";
}

// Форма регистрации — надмножество формы входа
type FormValues = RegisterInput;

export function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: Mode;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [serverError, setServerError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(
      (mode === "register"
        ? registerSchema
        : loginSchema) as typeof registerSchema,
    ),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const { error } =
      mode === "register"
        ? await authClient.signUp.email({
            name: values.name,
            email: values.email,
            password: values.password,
          })
        : await authClient.signIn.email({
            email: values.email,
            password: values.password,
          });

    if (error) {
      setServerError(errorMessage(error));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function onGoogle() {
    setServerError(null);
    setGooglePending(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
    });
    if (error) {
      setGooglePending(false);
      setServerError(errorMessage(error));
    }
  }

  const busy = isSubmitting || googlePending;

  return (
    <div className="flex flex-col gap-6">
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {mode === "register" && (
          <Field
            name="name"
            label="Имя"
            autoComplete="name"
            register={register}
            errors={errors}
          />
        )}
        <Field
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          register={register}
          errors={errors}
        />
        <Field
          name="password"
          label="Пароль"
          type="password"
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          hint={mode === "register" ? "Не короче 8 символов" : undefined}
          register={register}
          errors={errors}
        />

        {serverError && (
          <p role="alert" className="text-xs leading-4 text-expense">
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={busy} className="mt-2 w-full">
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {mode === "register" ? "Создать аккаунт" : "Войти"}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            или
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={busy}
            onClick={onGoogle}
            className="w-full"
          >
            {googlePending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Войти через Google
          </Button>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {mode === "register" ? "Уже есть аккаунт? " : "Нет аккаунта? "}
        <Link
          href={{
            pathname: mode === "register" ? "/login" : "/register",
            query: next !== "/dashboard" ? { next } : undefined,
          }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {mode === "register" ? "Войти" : "Зарегистрироваться"}
        </Link>
      </p>
    </div>
  );
}

function Field({
  name,
  label,
  hint,
  register,
  errors,
  ...inputProps
}: {
  name: keyof FormValues;
  label: string;
  hint?: string;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
} & Omit<React.ComponentProps<"input">, "name">) {
  const error = errors[name]?.message;
  const describedBy = error
    ? `${name}-error`
    : hint
      ? `${name}-hint`
      : undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...inputProps}
        {...register(name)}
      />
      {error ? (
        <p id={`${name}-error`} className="text-xs leading-4 text-expense">
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${name}-hint`}
          className="text-xs leading-4 text-muted-foreground"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

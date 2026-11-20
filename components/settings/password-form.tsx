"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validations";
import { changePasswordAction } from "@/server/actions/settings";
import { FieldError } from "./section";

const FIELDS: {
  name: keyof ChangePasswordInput;
  label: string;
  autoComplete: string;
}[] = [
  {
    name: "currentPassword",
    label: "Текущий пароль",
    autoComplete: "current-password",
  },
  { name: "newPassword", label: "Новый пароль", autoComplete: "new-password" },
  {
    name: "confirmPassword",
    label: "Повторите новый пароль",
    autoComplete: "new-password",
  },
];

/** Смена пароля. Остальные устройства после смены выходят из аккаунта. */
export function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ChangePasswordInput) {
    const result = await changePasswordAction(values);
    if (!result.ok) {
      const fields = Object.entries(result.fieldErrors ?? {});
      for (const [field, messages] of fields) {
        setError(field as keyof ChangePasswordInput, { message: messages[0] });
      }
      if (fields.length === 0) toast.error(result.error);
      return;
    }
    reset();
    toast.success("Пароль изменён", {
      description: "На других устройствах нужно будет войти заново",
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 sm:max-w-sm"
    >
      {FIELDS.map((f) => (
        <div key={f.name} className="flex flex-col gap-2">
          <Label htmlFor={`pw-${f.name}`}>{f.label}</Label>
          <Input
            id={`pw-${f.name}`}
            type="password"
            autoComplete={f.autoComplete}
            aria-invalid={Boolean(errors[f.name])}
            aria-describedby={errors[f.name] ? `pw-${f.name}-error` : undefined}
            {...register(f.name)}
          />
          <FieldError
            id={`pw-${f.name}-error`}
            message={errors[f.name]?.message}
          />
        </div>
      ))}
      <div>
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          Сменить пароль
        </Button>
      </div>
    </form>
  );
}

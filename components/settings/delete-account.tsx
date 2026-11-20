"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DELETE_CONFIRM_WORD } from "@/lib/validations";
import { deleteAccountAction } from "@/server/actions/settings";
import { FieldError } from "./section";

/**
 * Удаление аккаунта со всеми данными. Сначала кнопка раскрывает форму,
 * затем нужно ввести слово «УДАЛИТЬ» (и пароль, если вход по паролю).
 */
export function DeleteAccount({ needsPassword }: { needsPassword: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmed =
    confirm.trim().toLocaleUpperCase("ru") === DELETE_CONFIRM_WORD;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await deleteAccountAction({
        confirm,
        password: needsPassword ? password : undefined,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) setFormError(result.error);
        return;
      }
      toast.success("Аккаунт и все данные удалены");
      router.replace("/");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 />
          Удалить аккаунт
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 sm:max-w-sm"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="delete-confirm">
          Введите слово{" "}
          <span className="font-semibold text-expense">
            {DELETE_CONFIRM_WORD}
          </span>
        </Label>
        <Input
          id="delete-confirm"
          autoComplete="off"
          autoFocus
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={Boolean(errors.confirm)}
        />
        <FieldError message={errors.confirm?.[0]} />
      </div>
      {needsPassword && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-password">Пароль</Label>
          <Input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          <FieldError message={errors.password?.[0]} />
        </div>
      )}
      {formError && (
        <p role="alert" className="text-xs leading-4 text-expense">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="destructive"
          disabled={!confirmed || pending || (needsPassword && !password)}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
          Удалить навсегда
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setOpen(false);
            setConfirm("");
            setPassword("");
            setErrors({});
            setFormError(null);
          }}
          disabled={pending}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}

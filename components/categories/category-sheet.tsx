"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ActionResult } from "@/lib/action-result";
import {
  CATEGORY_TYPE_LABELS,
  type CategoryColor,
  type CategoryType,
} from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  categorySchema,
  type CategoryFormValues,
  type CategoryInput,
} from "@/lib/validations";
import {
  archiveCategoryAction,
  createCategoryAction,
  restoreCategoryAction,
  updateCategoryAction,
} from "@/server/actions/categories";
import { CategoryIcon } from "./category-icon";
import { ColorPicker, IconPicker } from "./pickers";

export type EditableCategory = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: CategoryColor;
};

export type SheetState =
  | { mode: "create"; type: CategoryType }
  | { mode: "edit"; category: EditableCategory }
  | null;

/** Создание и редактирование категории в выдвижной панели. */
export function CategorySheet({
  state,
  onClose,
}: {
  state: SheetState;
  onClose: () => void;
}) {
  return (
    <Sheet open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          // Новая категория — сразу в поле названия
          if (state?.mode !== "create") return;
          e.preventDefault();
          document.getElementById("category-name")?.focus();
        }}
      >
        {state && (
          // key: новая форма при каждом открытии — без «хвостов» от прошлой
          <CategoryForm
            key={
              state.mode === "edit" ? state.category.id : `new-${state.type}`
            }
            state={state}
            onDone={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CategoryForm({
  state,
  onDone,
}: {
  state: NonNullable<SheetState>;
  onDone: () => void;
}) {
  const editing = state.mode === "edit" ? state.category : null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [archiving, startArchive] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues, unknown, CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: editing
      ? {
          name: editing.name,
          type: editing.type,
          icon: editing.icon,
          color: editing.color,
        }
      : {
          name: "",
          type: state.mode === "create" ? state.type : "expense",
          icon: "ShoppingCart",
          color: "indigo",
        },
  });

  const [name, type, icon, color] = useWatch({
    control,
    name: ["name", "type", "icon", "color"],
  });

  function applyResult(result: ActionResult<unknown>) {
    if (result.ok) return true;
    setServerError(result.error);
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof CategoryFormValues, {
        message: messages[0],
      });
    }
    return false;
  }

  async function onSubmit(values: CategoryInput) {
    setServerError(null);
    const result = editing
      ? await updateCategoryAction({
          id: editing.id,
          name: values.name,
          icon: values.icon,
          color: values.color,
        })
      : await createCategoryAction(values);
    if (!applyResult(result)) return;
    toast.success(editing ? "Категория сохранена" : "Категория создана");
    onDone();
  }

  function onArchive() {
    if (!editing) return;
    setServerError(null);
    startArchive(async () => {
      const result = await archiveCategoryAction({ id: editing.id });
      if (!applyResult(result)) return;
      onDone();
      toast("Категория перемещена в архив", {
        description: "Операции в ней сохранены",
        action: {
          label: "Отменить",
          onClick: async () => {
            const undo = await restoreCategoryAction({ id: editing.id });
            if (!undo.ok) toast.error(undo.error);
          },
        },
      });
    });
  }

  const busy = isSubmitting || archiving;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SheetHeader>
        <SheetTitle>{editing ? "Категория" : "Новая категория"}</SheetTitle>
        <SheetDescription className="sr-only">
          Название, иконка и цвет категории
        </SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-6">
        {/* Превью */}
        <div className="flex items-center gap-3 rounded-lg border bg-surface p-3">
          <CategoryIcon icon={icon} color={color} size={40} />
          <div className="min-w-0">
            <p className="truncate font-medium">{name.trim() || "Название"}</p>
            <p className="text-xs text-muted-foreground">
              {type === "expense" ? "Расход" : "Доход"}
            </p>
          </div>
        </div>

        {editing ? null : (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Тип</legend>
            <div
              role="radiogroup"
              className="grid grid-cols-2 gap-1 rounded-md border bg-surface p-1"
            >
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={type === t}
                  onClick={() => setValue("type", t)}
                  className={cn(
                    "h-8 rounded-sm text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    type === t && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {CATEGORY_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="category-name">Название</Label>
          <Input
            id="category-name"
            autoComplete="off"
            maxLength={40}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "category-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p
              id="category-name-error"
              className="text-xs leading-4 text-expense"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        <ColorPicker
          registration={register("color")}
          invalid={!!errors.color}
        />
        <IconPicker
          registration={register("icon")}
          color={color}
          value={icon}
          invalid={!!errors.icon}
        />

        {serverError && !errors.name && (
          <p role="alert" className="text-xs leading-4 text-expense">
            {serverError}
          </p>
        )}
      </SheetBody>

      <SheetFooter>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            onClick={onArchive}
            disabled={busy}
            className="text-muted-foreground hover:text-expense"
          >
            {archiving ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Archive />
            )}
            В архив
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onDone}
            disabled={busy}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={busy}>
            {isSubmitting && <LoaderCircle className="animate-spin" />}
            {editing ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </SheetFooter>
    </form>
  );
}

import type { CategoryColor, CategoryType } from "@/lib/categories";

/** Категория, как её видит форма операции. */
export type FormCategory = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: CategoryColor;
  isArchived: boolean;
};

/** Операция, открытая на редактирование. */
export type EditableTransaction = {
  id: string;
  type: CategoryType;
  amount: number;
  categoryId: string;
  date: string;
  note: string | null;
};

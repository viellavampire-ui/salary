import type { Metadata } from "next";
import { Tags } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Категории" };

export default function CategoriesPage() {
  return (
    <PlaceholderPage
      title="Категории"
      Icon={Tags}
      step={8}
      description="Свои категории расходов и доходов с иконками и цветами."
    />
  );
}

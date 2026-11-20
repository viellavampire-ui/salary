import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Настройки" };

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Настройки"
      Icon={Settings}
      step={13}
      description="Валюта, первый день месяца, экспорт в CSV и управление аккаунтом."
    />
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { DeleteAccount } from "@/components/settings/delete-account";
import { ExportForm } from "@/components/settings/export-form";
import { PasswordForm } from "@/components/settings/password-form";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { SettingsSection } from "@/components/settings/section";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { UserAvatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db";
import { requireUser } from "@/lib/dal";
import { toISODate } from "@/lib/period";
import { hasPasswordLogin } from "@/server/data/settings";

export const metadata: Metadata = { title: "Настройки" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Настройки" />
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}

async function SettingsContent() {
  const user = await requireUser();
  const passwordLogin = await hasPasswordLogin(db, user.id);
  const today = toISODate(new Date());

  return (
    <div className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <SettingsSection title="Профиль">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={user.name}
            image={user.image}
            className="size-12 text-base"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="preferences"
        title="Деньги и периоды"
        description="Валюта для всех сумм и день, с которого считается месяц"
      >
        <PreferencesForm
          // после сохранения — новые исходные значения формы
          key={`${user.currency}-${user.monthStartDay}`}
          currency={user.currency}
          monthStartDay={user.monthStartDay}
          today={today}
        />
      </SettingsSection>

      <SettingsSection id="theme" title="Тема оформления">
        <ThemeSelector />
      </SettingsSection>

      <SettingsSection
        id="export"
        title="Экспорт данных"
        description="Все операции в файле CSV — откроется в Excel, Numbers или Google Таблицах"
      >
        <ExportForm monthStartDay={user.monthStartDay} today={today} />
      </SettingsSection>

      <SettingsSection
        id="password"
        title="Пароль"
        description={
          passwordLogin
            ? "После смены пароля на других устройствах нужно будет войти заново"
            : undefined
        }
      >
        {passwordLogin ? (
          <PasswordForm />
        ) : (
          <p className="text-sm text-muted-foreground">
            Вы входите через Google — пароль для Salary не задан.
          </p>
        )}
      </SettingsSection>

      <SettingsSection
        id="danger"
        tone="danger"
        title="Удаление аккаунта"
        description="Аккаунт, категории, операции и бюджеты будут удалены без возможности восстановления. Перед этим можно скачать данные в CSV."
      >
        <DeleteAccount needsPassword={passwordLogin} />
      </SettingsSection>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-6" aria-busy>
      {[96, 220, 120, 180].map((h, i) => (
        <Skeleton key={i} className="rounded-lg" style={{ height: h }} />
      ))}
    </div>
  );
}

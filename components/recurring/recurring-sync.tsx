"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { showBudgetAlerts } from "@/components/notifications/alert-toasts";
import { plural } from "@/lib/plural";
import { syncRecurringAction } from "@/server/actions/recurring";

/**
 * При открытии приложения создаёт регулярные операции, дата которых
 * наступила, и сообщает об этом. Ничего не рисует. Отдельного планировщика
 * не нужно: операции «догоняются» при следующем визите.
 */
export function RecurringSync() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void syncRecurringAction().then((result) => {
      if (!result.ok || result.data.created === 0) return;
      const n = result.data.created;
      toast.success(
        `Добавлено ${n} ${plural(n, "регулярная операция", "регулярные операции", "регулярных операций")}`,
        { description: "По расписанию регулярных платежей" },
      );
      showBudgetAlerts(result.data.alerts, result.data.currency, (href) =>
        router.push(href),
      );
    });
  }, [router]);

  return null;
}

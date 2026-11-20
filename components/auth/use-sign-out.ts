"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export function useSignOut() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error("Не удалось выйти. Попробуйте ещё раз");
        return;
      }
      router.replace("/login");
      router.refresh();
    });
  }

  return { signOut, pending };
}

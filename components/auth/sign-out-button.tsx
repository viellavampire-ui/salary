"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
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

  return (
    <Button variant="secondary" onClick={signOut} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
      Выйти
    </Button>
  );
}

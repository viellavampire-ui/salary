import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NEW_TRANSACTION_HREF } from "./nav-items";

/** Кнопка «+ Операция» в шапке страницы (на телефоне — кнопка «+» внизу). */
export function NewTransactionButton() {
  return (
    <Button asChild className="hidden md:inline-flex">
      <Link href={NEW_TRANSACTION_HREF}>
        <Plus />
        Операция
      </Link>
    </Button>
  );
}

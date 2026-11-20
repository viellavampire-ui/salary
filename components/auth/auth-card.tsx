import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isGoogleEnabled } from "@/lib/auth";
import { AuthForm } from "./auth-form";

const COPY = {
  login: {
    title: "Вход в Salary",
    description: "Рады видеть вас снова",
  },
  register: {
    title: "Регистрация",
    description: "Начните понимать, куда уходят деньги",
  },
} as const;

export function AuthCard({ mode }: { mode: "login" | "register" }) {
  return (
    <Card className="bg-background md:bg-card">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl leading-8">{COPY[mode].title}</CardTitle>
        <CardDescription>{COPY[mode].description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* useSearchParams внутри формы требует границу Suspense */}
        <Suspense fallback={<FormSkeleton mode={mode} />}>
          <AuthForm mode={mode} googleEnabled={isGoogleEnabled} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

function FormSkeleton({ mode }: { mode: "login" | "register" }) {
  const fields = mode === "register" ? 3 : 2;
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="mt-2 h-10 w-full" />
    </div>
  );
}

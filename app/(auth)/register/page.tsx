import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Регистрация" };

export default function RegisterPage() {
  return <AuthCard mode="register" />;
}

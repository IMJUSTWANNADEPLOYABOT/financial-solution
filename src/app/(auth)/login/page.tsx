import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <>
      <p className="mb-6 text-center text-sm text-muted-foreground">Войди, чтобы продолжить</p>
      <AuthForm mode="login" />
    </>
  );
}

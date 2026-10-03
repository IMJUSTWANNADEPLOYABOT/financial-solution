import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Регистрация" };

export default function RegisterPage() {
  return (
    <>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Придумай логин и пароль — почта не нужна
      </p>
      <AuthForm mode="register" />
    </>
  );
}

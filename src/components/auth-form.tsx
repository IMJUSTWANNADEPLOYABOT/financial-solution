"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { login, register, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : register,
    null,
  );
  // Логин держим в состоянии: React сбрасывает поля формы после отправки action.
  const [username, setUsername] = useState("");
  const timezoneRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (timezoneRef.current) {
      timezoneRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }, []);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok && !fieldErrors ? state.error : undefined;

  return (
    <form action={action} className="grid gap-5">
      <input ref={timezoneRef} type="hidden" name="timezone" />
      <div className="grid gap-2">
        <Label htmlFor="username">Логин</Label>
        <Input
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="h-11 text-base"
          aria-invalid={!!fieldErrors?.username}
        />
        {fieldErrors?.username && (
          <p className="text-sm text-destructive">{fieldErrors.username}</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          className="h-11 text-base"
          aria-invalid={!!fieldErrors?.password}
        />
        {fieldErrors?.password && (
          <p className="text-sm text-destructive">{fieldErrors.password}</p>
        )}
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" className="h-11 text-base" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {mode === "login" ? "Войти" : "Создать аккаунт"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            Нет аккаунта?{" "}
            <Link href="/register" className="font-medium text-primary-strong hover:underline">
              Зарегистрироваться
            </Link>
          </>
        ) : (
          <>
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-medium text-primary-strong hover:underline">
              Войти
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, users } from "@/db/schema";
import { zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { createSession, destroyAllSessions, destroySession, requireUser } from "@/lib/auth";
import { BASE_PATH } from "@/lib/constants";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Минимум 3 символа")
  .max(32, "Максимум 32 символа")
  .regex(/^[a-z0-9_.-]+$/, "Только латиница, цифры и символы _ . -");

const password = z.string().min(6, "Минимум 6 символов").max(128, "Слишком длинный пароль");

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("ru-RU", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/**
 * redirect() для форм входа/выхода. Если форма ушла до загрузки JS (обычный POST), Next кладёт
 * путь в Location как есть, без basePath, и браузер уходит на корень домена. Поэтому для такого
 * запроса добавляем basePath сами; при отправке через JS (заголовок Next-Action) Next делает это сам.
 * Главная — без завершающего слэша: иначе Next отвечает ещё одним редиректом 308, и Safari после
 * него повторяет исходный POST.
 */
async function redirectTo(path: "/" | "/login"): Promise<never> {
  const isFetchAction = (await headers()).has("next-action");
  redirect(isFetchAction ? path : path === "/" ? BASE_PATH : `${BASE_PATH}${path}`);
}

export type AuthState = ActionResult | null;

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ username, password, timezone: z.string().optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Проверь поля", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  if (!rateLimit(`register:${await clientIp()}`, 10, 60 * 60 * 1000)) {
    return { ok: false, error: "Слишком много попыток. Попробуй позже." };
  }

  const { username: name, password: pass, timezone } = parsed.data;
  const exists = db.select({ id: users.id }).from(users).where(eq(users.username, name)).get();
  if (exists) {
    return { ok: false, error: "Проверь поля", fieldErrors: { username: "Логин уже занят" } };
  }

  const passwordHash = await hashPassword(pass);
  const userId = db.transaction((tx) => {
    const user = tx
      .insert(users)
      .values({
        username: name,
        passwordHash,
        timezone: timezone && isValidTimezone(timezone) ? timezone : undefined,
      })
      .returning({ id: users.id })
      .get();
    tx.insert(categories)
      .values(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, userId: user.id, sortOrder: i * 10 })))
      .run();
    return user.id;
  });

  await createSession(userId);
  return redirectTo("/");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ username: z.string().trim().toLowerCase().min(1), password: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Введи логин и пароль" };

  if (!rateLimit(`login:${await clientIp()}`, 20, 15 * 60 * 1000)) {
    return { ok: false, error: "Слишком много попыток. Подожди 15 минут." };
  }

  const user = db.select().from(users).where(eq(users.username, parsed.data.username)).get();
  const valid = user ? await verifyPassword(user.passwordHash, parsed.data.password) : false;
  if (!user || !valid) return { ok: false, error: "Неверный логин или пароль" };

  await createSession(user.id);
  return redirectTo("/");
}

export async function logout() {
  await destroySession();
  return redirectTo("/login");
}

export async function logoutEverywhere() {
  const user = await requireUser();
  await destroyAllSessions(user.id);
  return redirectTo("/login");
}

export async function changePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await requireUser();
  const parsed = z
    .object({ current: z.string().min(1, "Введи текущий пароль"), next: password })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Проверь поля", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }
  if (!(await verifyPassword(user.passwordHash, parsed.data.current))) {
    return { ok: false, error: "Проверь поля", fieldErrors: { current: "Неверный пароль" } };
  }
  db.update(users)
    .set({ passwordHash: await hashPassword(parsed.data.next) })
    .where(eq(users.id, user.id))
    .run();
  return { ok: true };
}

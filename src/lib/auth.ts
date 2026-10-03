import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { BASE_PATH, SESSION_COOKIE } from "@/lib/constants";

const SESSION_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: BASE_PATH,
    expires,
  };
}

/** Создаёт сессию и ставит cookie. Вызывать только из Server Action / Route Handler. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;

  db.insert(sessions)
    .values({ id: hashToken(token), userId, userAgent, lastSeenAt: now, expiresAt })
    .run();

  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token)
    db.delete(sessions)
      .where(eq(sessions.id, hashToken(token)))
      .run();
  store.set(SESSION_COOKIE, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

export async function destroyAllSessions(userId: string) {
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

/** Текущий пользователь или null. Кэшируется на время одного запроса. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, hashToken(token)))
    .get();
  if (!row) return null;

  const now = Date.now();
  if (row.session.expiresAt.getTime() < now) {
    db.delete(sessions).where(eq(sessions.id, row.session.id)).run();
    return null;
  }

  // Продлеваем сессию не чаще раза в сутки, чтобы не писать в БД на каждый запрос.
  if (now - row.session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    db.update(sessions)
      .set({ lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_TTL_MS) })
      .where(eq(sessions.id, row.session.id))
      .run();
  }

  return row.user;
});

/** Для страниц и действий, доступных только после входа. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

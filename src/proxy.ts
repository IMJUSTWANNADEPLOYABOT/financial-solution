import { NextResponse, type NextRequest } from "next/server";

import { BASE_PATH, SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/register"];

// Быстрая проверка наличия cookie. Саму сессию проверяет layout через БД.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  // Браузеры ограничивают срок cookie (Chrome — 400 дней), поэтому продлеваем её
  // при каждом заходе: пока пользователь открывает приложение, он не разлогинится.
  if (token && request.method === "GET") {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
      path: BASE_PATH,
      maxAge: SESSION_COOKIE_MAX_AGE,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/|api/diag|manifest.webmanifest|sw.js|boot-check.js|offline.html|icons/).*)"],
};

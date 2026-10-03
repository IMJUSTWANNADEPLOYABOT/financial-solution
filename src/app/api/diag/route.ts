import { rateLimit } from "@/lib/rate-limit";

// Приёмник диагностических отчётов от public/boot-check.js. Отчёты просто пишутся в лог
// контейнера: `docker logs finance-auditor | grep "\[diag\]"`.
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  if (!rateLimit(`diag:${ip}`, 30, 60_000)) return new Response(null, { status: 429 });

  const text = (await request.text()).slice(0, 8_000);
  console.log(`[diag] ${new Date().toISOString()} ip=${ip} ${text}`);
  return new Response(null, { status: 204 });
}

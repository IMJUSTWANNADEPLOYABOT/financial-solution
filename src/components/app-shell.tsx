"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ListOrdered, Plus, Settings } from "lucide-react";

import { Logo } from "@/components/logo";
import { useTransactionSheet } from "@/components/transaction-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Обзор", icon: LayoutDashboard },
  { href: "/transactions", label: "Операции", icon: ListOrdered },
  { href: "/settings", label: "Настройки", icon: Settings },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Перезапрашивает данные при возврате на вкладку — так изменения с других устройств видны сразу. */
function RefreshOnFocus() {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - last > 5_000) {
        last = Date.now();
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);
  return null;
}

export function AppShell({ username, children }: { username: string; children: React.ReactNode }) {
  const { open } = useTransactionSheet();
  const isActive = useIsActive();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <RefreshOnFocus />

      {/* Сайдбар на ПК */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-sidebar px-4 py-6 md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <Logo />
          <span className="font-semibold tracking-tight">Finance Auditor</span>
        </Link>
        <Button size="lg" className="h-10 justify-start gap-2 px-3" onClick={() => open()}>
          <Plus />
          Добавить
          <kbd className="ml-auto rounded border border-primary-foreground/30 px-1.5 text-[10px] font-normal opacity-80">
            N
          </kbd>
        </Button>
        <nav className="grid gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive(href) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto truncate px-3 text-xs text-muted-foreground">@{username}</div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Шапка на телефоне */}
        <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
          <div className="flex h-14 items-center gap-2.5">
            <Logo className="size-7" />
            <span className="font-semibold tracking-tight">Finance Auditor</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-12">
          {children}
        </main>
      </div>

      {/* Нижняя навигация на телефоне */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-safe backdrop-blur-md md:hidden">
        <div className="grid h-16 grid-cols-4 items-center">
          {NAV.slice(0, 2).map((item) => (
            <BottomLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => open()}
              aria-label="Добавить операцию"
              className="-mt-7 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              <Plus className="size-7" strokeWidth={2.4} />
            </button>
          </div>
          <BottomLink {...NAV[2]} active={isActive(NAV[2].href)} />
        </div>
      </nav>
    </div>
  );
}

function BottomLink({
  href,
  label,
  icon: Icon,
  active,
}: (typeof NAV)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 text-[11px] text-muted-foreground transition-colors",
        active && "text-primary-strong",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}

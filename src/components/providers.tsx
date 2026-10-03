"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

import { ServiceWorkerRegistration } from "@/components/service-worker";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  // Сообщаем сторожу запуска (public/boot-check.js), что React-приложение поднялось.
  useEffect(() => {
    (window as Window & { __faHydrated?: boolean }).__faHydrated = true;
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster position="top-center" />
      <ServiceWorkerRegistration />
    </ThemeProvider>
  );
}

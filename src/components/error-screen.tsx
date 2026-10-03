"use client";

import { useEffect } from "react";

/** Удаляет service worker и кэши, затем перезагружает страницу. */
export async function resetAppCache() {
  try {
    const registrations = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(registrations.map((r) => r.unregister()));
    const keys = (await caches?.keys?.()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } finally {
    location.reload();
  }
}

// Стили инлайном: global-error рендерится без глобального CSS приложения.
const button: React.CSSProperties = {
  font: "inherit",
  fontSize: 15,
  border: 0,
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
};

/** Экран ошибки с текстом для диагностики: его можно сфотографировать и прислать разработчику. */
export function ErrorScreen({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => console.error(error), [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        background: "#ffffff",
        color: "#1f1724",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Что-то пошло не так</h1>
        <p style={{ margin: "0 0 16px", opacity: 0.7 }}>
          Попробуй ещё раз. Если не поможет — сбрось кэш приложения и пришли скриншот этого экрана.
        </p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12,
            background: "#f4ecf8",
            borderRadius: 10,
            padding: 12,
            margin: "0 0 16px",
          }}
        >
          {error.message || String(error)}
          {error.digest ? `\ndigest: ${error.digest}` : ""}
          {typeof navigator !== "undefined" ? `\n\n${navigator.userAgent}` : ""}
        </pre>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={retry}
            style={{ ...button, background: "#d9bce6", color: "#3b1f47" }}
          >
            Повторить
          </button>
          <button
            type="button"
            onClick={resetAppCache}
            style={{ ...button, background: "#efe9f2", color: "#3b1f47" }}
          >
            Сбросить кэш и перезагрузить
          </button>
        </div>
      </div>
    </div>
  );
}

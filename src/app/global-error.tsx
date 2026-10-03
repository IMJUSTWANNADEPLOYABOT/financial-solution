"use client";

import { ErrorScreen } from "@/components/error-screen";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ru">
      <body style={{ margin: 0 }}>
        <title>Ошибка · Finance Auditor</title>
        <ErrorScreen {...props} />
      </body>
    </html>
  );
}

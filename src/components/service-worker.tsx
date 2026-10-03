"use client";

import { useEffect } from "react";

import { BASE_PATH } from "@/lib/constants";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(`${BASE_PATH}/sw.js`, { scope: BASE_PATH, updateViaCache: "none" })
      .catch(() => {});
  }, []);
  return null;
}

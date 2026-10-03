import type { MetadataRoute } from "next";

import { APP_NAME, BASE_PATH } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: BASE_PATH,
    name: APP_NAME,
    short_name: "Finance",
    description: "Учёт личных расходов и доходов",
    lang: "ru",
    start_url: BASE_PATH,
    scope: BASE_PATH,
    display: "standalone",
    orientation: "portrait",
    background_color: "#121016",
    theme_color: "#7c3aed",
    categories: ["finance", "productivity"],
    icons: [
      { src: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      {
        src: `${BASE_PATH}/icons/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Операции",
        url: `${BASE_PATH}/transactions`,
        icons: [{ src: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192" }],
      },
    ],
  };
}

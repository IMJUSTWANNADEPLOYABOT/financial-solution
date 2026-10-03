import type { NextConfig } from "next";

export const BASE_PATH = "/finance-auditor";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  output: "standalone",
  // Native modules must stay outside of the bundle.
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          // Позволяет SW контролировать и сам корень /finance-auditor (без слэша).
          { key: "Service-Worker-Allowed", value: BASE_PATH },
        ],
      },
    ];
  },
};

export default nextConfig;

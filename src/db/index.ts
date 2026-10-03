import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { db?: DB };

function createDb(): DB {
  const file = path.resolve(
    /*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/finance.db",
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  // Встроенный lower() в SQLite понимает только ASCII — нужен для поиска по кириллице.
  sqlite.function("unicode_lower", { deterministic: true }, (value: unknown) =>
    typeof value === "string" ? value.toLowerCase() : value,
  );

  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: path.resolve(/*turbopackIgnore: true*/ process.cwd(), "drizzle"),
  });
  return db;
}

// В dev-режиме модуль перезагружается при HMR — держим одно соединение на процесс.
export const db: DB = globalForDb.db ?? (globalForDb.db = createDb());

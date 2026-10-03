import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export type TransactionKind = "expense" | "income";

export const users = sqliteTable("users", {
  id: id(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  currency: text("currency").notNull().default("RUB"),
  // IANA-зона пользователя: нужна, чтобы понять, какое у него сейчас «сегодня».
  timezone: text("timezone").notNull().default("Europe/Moscow"),
  createdAt: createdAt(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    // sha256 от токена; сам токен хранится только в cookie.
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    kind: text("kind").$type<TransactionKind>().notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("categories_user_name_kind_uq").on(t.userId, t.name, t.kind)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    kind: text("kind").$type<TransactionKind>().notNull(),
    // Сумма в копейках, всегда положительная; знак определяется kind.
    amount: integer("amount").notNull(),
    // Календарная дата операции у пользователя, YYYY-MM-DD.
    date: text("date").notNull(),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_user_category_idx").on(t.userId, t.categoryId),
  ],
);

export const budgets = sqliteTable(
  "budgets",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // NULL — общий месячный лимит.
    categoryId: text("category_id").references(() => categories.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
  },
  (t) => [
    uniqueIndex("budgets_user_category_uq").on(t.userId, t.categoryId),
    // В SQLite NULL не участвует в UNIQUE, поэтому общий лимит ограничиваем отдельным индексом.
    uniqueIndex("budgets_user_total_uq")
      .on(t.userId)
      .where(sql`category_id IS NULL`),
  ],
);

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;

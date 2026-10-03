import "server-only";

import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { db } from "@/db";
import { budgets, categories, transactions, type TransactionKind } from "@/db/schema";

export function getCategories(userId: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt))
    .all();
}

export type CategoryTotal = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
};

export function getSummary(userId: string, from: string, to: string) {
  const range = and(
    eq(transactions.userId, userId),
    gte(transactions.date, from),
    lte(transactions.date, to),
  );

  const totals = db
    .select({ kind: transactions.kind, total: sql<number>`sum(${transactions.amount})` })
    .from(transactions)
    .where(range)
    .groupBy(transactions.kind)
    .all();

  const byCategory = (kind: TransactionKind): CategoryTotal[] =>
    db
      .select({
        categoryId: categories.id,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
        total: sql<number>`sum(${transactions.amount})`,
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(range, eq(transactions.kind, kind)))
      .groupBy(categories.id)
      .orderBy(desc(sql`sum(${transactions.amount})`))
      .all();

  const expense = totals.find((t) => t.kind === "expense")?.total ?? 0;
  const income = totals.find((t) => t.kind === "income")?.total ?? 0;

  return {
    expense,
    income,
    balance: income - expense,
    expenseByCategory: byCategory("expense"),
    incomeByCategory: byCategory("income"),
  };
}

/** Расходы по дням (для периодов до ~2 месяцев) или по месяцам (для длинных). */
export function getExpenseSeries(
  userId: string,
  from: string,
  to: string,
  bucket: "day" | "month",
) {
  const key =
    bucket === "day" ? transactions.date : sql<string>`substr(${transactions.date}, 1, 7)`;
  return db
    .select({ key: sql<string>`${key}`, total: sql<number>`sum(${transactions.amount})` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.kind, "expense"),
        gte(transactions.date, from),
        lte(transactions.date, to),
      ),
    )
    .groupBy(key)
    .all();
}

export type TransactionSort = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export type TransactionFilters = {
  from: string;
  to: string;
  kind?: TransactionKind;
  categoryIds?: string[];
  query?: string;
  sort?: TransactionSort;
  limit?: number;
};

export function getTransactions(userId: string, f: TransactionFilters) {
  const where: SQL[] = [
    eq(transactions.userId, userId),
    gte(transactions.date, f.from),
    lte(transactions.date, f.to),
  ];
  if (f.kind) where.push(eq(transactions.kind, f.kind));
  if (f.categoryIds?.length) where.push(inArray(transactions.categoryId, f.categoryIds));
  if (f.query) {
    const escaped = f.query.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`);
    where.push(sql`unicode_lower(${transactions.note}) LIKE ${`%${escaped}%`} ESCAPE '\\'`);
  }

  const order = {
    date_desc: [desc(transactions.date), desc(transactions.createdAt)],
    date_asc: [asc(transactions.date), asc(transactions.createdAt)],
    amount_desc: [desc(transactions.amount), desc(transactions.date)],
    amount_asc: [asc(transactions.amount), desc(transactions.date)],
  }[f.sort ?? "date_desc"];

  const query = db
    .select()
    .from(transactions)
    .where(and(...where))
    .orderBy(...order);

  return (f.limit ? query.limit(f.limit) : query).all();
}

export function getBudgets(userId: string) {
  return db.select().from(budgets).where(eq(budgets.userId, userId)).all();
}

/** Состояние лимитов на календарный месяц, в который попадает дата. */
export function getBudgetStatus(userId: string, date: string) {
  const d = parseISO(date);
  const from = format(startOfMonth(d), "yyyy-MM-dd");
  const to = format(endOfMonth(d), "yyyy-MM-dd");

  const list = getBudgets(userId);
  if (list.length === 0) return null;

  const spentByCategory = new Map(
    db
      .select({
        categoryId: transactions.categoryId,
        total: sql<number>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.kind, "expense"),
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .groupBy(transactions.categoryId)
      .all()
      .map((r) => [r.categoryId, r.total]),
  );
  const totalSpent = [...spentByCategory.values()].reduce((a, b) => a + b, 0);

  const total = list.find((b) => b.categoryId === null);
  return {
    from,
    to,
    total: total ? { limit: total.amount, spent: totalSpent } : null,
    categories: list
      .filter((b) => b.categoryId !== null)
      .map((b) => ({
        categoryId: b.categoryId!,
        limit: b.amount,
        spent: spentByCategory.get(b.categoryId!) ?? 0,
      })),
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, transactions, type Transaction, type TransactionKind } from "@/db/schema";
import { zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";

const input = z.object({
  kind: z.enum(["expense", "income"]),
  amount: z.number().int().positive("Введи сумму").max(100_000_000_000, "Слишком большая сумма"),
  categoryId: z.string().min(1, "Выбери категорию"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Некорректная дата"),
  note: z
    .string()
    .trim()
    .max(200, "Не длиннее 200 символов")
    .nullish()
    .transform((v) => v || null),
});

export type TransactionInput = z.input<typeof input>;

function ownsCategory(userId: string, categoryId: string, kind: TransactionKind) {
  return !!db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(eq(categories.id, categoryId), eq(categories.userId, userId), eq(categories.kind, kind)),
    )
    .get();
}

type Parsed =
  | { ok: true; data: z.output<typeof input> }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function parse(userId: string, data: TransactionInput): Parsed {
  const parsed = input.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "Проверь поля", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }
  if (!ownsCategory(userId, parsed.data.categoryId, parsed.data.kind)) {
    return { ok: false, error: "Категория не найдена" };
  }
  return { ok: true, data: parsed.data };
}

export async function createTransaction(
  data: TransactionInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = parse(user.id, data);
  if (!result.ok) return result;

  const row = db
    .insert(transactions)
    .values({ ...result.data, userId: user.id })
    .returning({ id: transactions.id })
    .get();
  revalidatePath("/", "layout");
  return { ok: true, data: { id: row.id } };
}

export async function updateTransaction(id: string, data: TransactionInput): Promise<ActionResult> {
  const user = await requireUser();
  const result = parse(user.id, data);
  if (!result.ok) return result;

  const updated = db
    .update(transactions)
    .set({ ...result.data, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .run();
  if (updated.changes === 0) return { ok: false, error: "Запись не найдена" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult<Transaction>> {
  const user = await requireUser();
  const row = db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .returning()
    .get();
  if (!row) return { ok: false, error: "Запись не найдена" };
  revalidatePath("/", "layout");
  return { ok: true, data: row };
}

/** Отмена удаления: восстанавливает запись с тем же id. */
export async function restoreTransaction(row: Transaction): Promise<ActionResult> {
  const user = await requireUser();
  const result = parse(user.id, row);
  if (!result.ok) return result;

  db.insert(transactions)
    .values({ ...result.data, id: row.id, userId: user.id, createdAt: new Date(row.createdAt) })
    .onConflictDoNothing()
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}

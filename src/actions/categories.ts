"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { CATEGORY_ICON_NAMES } from "@/lib/category-icons";

const fields = z.object({
  name: z.string().trim().min(1, "Введи название").max(40, "Не длиннее 40 символов"),
  icon: z.string().refine((v) => CATEGORY_ICON_NAMES.includes(v), "Неизвестная иконка"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Некорректный цвет"),
});

const createInput = fields.extend({ kind: z.enum(["expense", "income"]) });

export type CategoryInput = z.input<typeof createInput>;

const DUPLICATE: ActionResult = {
  ok: false,
  error: "Проверь поля",
  fieldErrors: { name: "Такая категория уже есть" },
};

function isUniqueViolation(e: unknown) {
  return e instanceof Error && e.message.includes("UNIQUE");
}

export async function createCategory(data: CategoryInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createInput.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "Проверь поля", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }
  const last = db
    .select({ value: max(categories.sortOrder) })
    .from(categories)
    .where(eq(categories.userId, user.id))
    .get();
  try {
    db.insert(categories)
      .values({ ...parsed.data, userId: user.id, sortOrder: (last?.value ?? 0) + 1 })
      .run();
  } catch (e) {
    if (isUniqueViolation(e)) return DUPLICATE;
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCategory(
  id: string,
  data: Omit<CategoryInput, "kind">,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = fields.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "Проверь поля", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }
  try {
    db.update(categories)
      .set(parsed.data)
      .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
      .run();
  } catch (e) {
    if (isUniqueViolation(e)) return DUPLICATE;
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  db.update(categories)
    .set({ archived })
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const used = db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(eq(transactions.categoryId, id), eq(transactions.userId, user.id)))
    .get();
  if (used && used.count > 0) {
    return {
      ok: false,
      error: `В категории есть операции (${used.count}). Скрой её вместо удаления.`,
    };
  }
  db.delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { budgets, categories, users } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";

const budgetInput = z.object({
  // null — общий лимит снят.
  total: z.number().int().positive().nullable(),
  categories: z.array(z.object({ categoryId: z.string(), amount: z.number().int().positive() })),
});

export async function saveBudgets(data: z.input<typeof budgetInput>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = budgetInput.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Некорректные суммы" };

  const ids = parsed.data.categories.map((c) => c.categoryId);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Повторяющиеся категории" };
  if (ids.length) {
    const owned = db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, user.id),
          eq(categories.kind, "expense"),
          inArray(categories.id, ids),
        ),
      )
      .all();
    if (owned.length !== ids.length) return { ok: false, error: "Категория не найдена" };
  }

  db.transaction((tx) => {
    tx.delete(budgets).where(eq(budgets.userId, user.id)).run();
    const rows = [
      ...(parsed.data.total
        ? [{ userId: user.id, categoryId: null, amount: parsed.data.total }]
        : []),
      ...parsed.data.categories.map((c) => ({ userId: user.id, ...c })),
    ];
    if (rows.length) tx.insert(budgets).values(rows).run();
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveTimezone(timezone: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    new Intl.DateTimeFormat("ru-RU", { timeZone: timezone });
  } catch {
    return { ok: false, error: "Неизвестный часовой пояс" };
  }
  db.update(users).set({ timezone }).where(eq(users.id, user.id)).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

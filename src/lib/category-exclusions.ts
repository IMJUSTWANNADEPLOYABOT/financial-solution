import type { Category } from "@/db/schema";

export const CATEGORY_EXCLUSIONS_PARAM = "exclude";

/** Принимаем только категории расходов текущего пользователя, включая архивные. */
export function parseCategoryExclusions(
  value: string | string[] | undefined,
  categories: Pick<Category, "id" | "kind">[],
): string[] {
  const requested = new Set(
    (Array.isArray(value) ? value : [value ?? ""]).flatMap((part) => part.split(",")),
  );
  return categories.filter((c) => c.kind === "expense" && requested.has(c.id)).map((c) => c.id);
}

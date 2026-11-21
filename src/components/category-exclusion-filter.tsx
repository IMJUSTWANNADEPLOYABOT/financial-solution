"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, SlidersHorizontal, X } from "lucide-react";

import { CategoryBadge } from "@/components/category-badge";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import type { Category } from "@/db/schema";
import { CATEGORY_EXCLUSIONS_PARAM } from "@/lib/category-exclusions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ExclusionCategory = Pick<Category, "id" | "name" | "icon" | "color" | "archived"> & {
  total: number;
};

type Props = {
  categories: ExclusionCategory[];
  excludedIds: string[];
  allExpensesExcluded?: boolean;
};

export function CategoryExclusionFilter({
  categories,
  excludedIds,
  allExpensesExcluded = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set(excludedIds));
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const excluded = categories.filter((c) => excludedIds.includes(c.id));
  const draftTotal = categories.reduce((sum, c) => sum + (draft.has(c.id) ? c.total : 0), 0);

  function apply(ids: string[]) {
    const params = new URLSearchParams(searchParams);
    if (ids.length) params.set(CATEGORY_EXCLUSIONS_PARAM, ids.join(","));
    else params.delete(CATEGORY_EXCLUSIONS_PARAM);
    startTransition(() => {
      router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    });
  }

  function onOpenChange(next: boolean) {
    if (next) setDraft(new Set(excludedIds));
    setOpen(next);
    if (!next) triggerRef.current?.focus();
  }

  return (
    <div className="grid gap-3" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          ref={triggerRef}
          type="button"
          variant={excluded.length ? "secondary" : "outline"}
          className="h-11 gap-2 px-3"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={pending || categories.length === 0}
          onClick={() => onOpenChange(true)}
        >
          {pending ? <Loader2 className="animate-spin" /> : <SlidersHorizontal />}
          Исключить категории
          {excluded.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {excluded.length}
            </span>
          )}
        </Button>
        {excluded.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-muted-foreground"
            disabled={pending}
            onClick={() => apply([])}
          >
            Сбросить
          </Button>
        )}
      </div>

      {excluded.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Исключены:</span>
          {excluded.map((c) => (
            <button
              key={c.id}
              type="button"
              className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-primary-strong/20 bg-accent py-2 pr-3 pl-2 text-sm text-accent-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              aria-label={`Вернуть в расчёт: ${c.name}`}
              disabled={pending}
              onClick={() => apply(excludedIds.filter((id) => id !== c.id))}
            >
              <CategoryBadge icon={c.icon} color={c.color} size="sm" />
              <span className="min-w-0 break-words">{c.name}</span>
              <X className="size-3.5 shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {allExpensesExcluded && (
        <div role="status" className="rounded-xl border border-dashed px-4 py-4 text-sm">
          <p className="font-medium">Все расходы за период исключены</p>
          <p className="mt-1 text-muted-foreground">
            Верни категории в расчёт или сбрось фильтр, чтобы увидеть все расходы.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11"
            disabled={pending}
            onClick={() => apply([])}
          >
            Сбросить фильтр
          </Button>
        </div>
      )}

      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title="Какие расходы исключить, моя королева?"
        description="Выбранные категории не учитываются в обзоре."
        scrollableBody
      >
        <div className="flex shrink-0 items-center justify-between gap-2 pb-2 text-sm">
          <span className="text-muted-foreground">Выбрано: {draft.size}</span>
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            disabled={draft.size === 0}
            onClick={() => setDraft(new Set())}
          >
            Снять выбор
          </Button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <fieldset className="grid gap-1">
            <legend className="sr-only">Категории расходов для исключения</legend>
            {categories.map((c) => (
              <label
                key={c.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-inset",
                  draft.has(c.id) && "bg-accent/60",
                )}
              >
                <input
                  type="checkbox"
                  checked={draft.has(c.id)}
                  className="size-5 shrink-0 accent-primary-strong"
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setDraft((current) => {
                      const next = new Set(current);
                      if (checked) next.add(c.id);
                      else next.delete(c.id);
                      return next;
                    });
                  }}
                />
                <CategoryBadge icon={c.icon} color={c.color} size="sm" />
                <span className="min-w-0 flex-1 text-sm break-words">
                  {c.name}
                  {c.archived && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">В архиве</span>
                  )}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground tabular">
                  {formatMoney(c.total)}
                </span>
              </label>
            ))}
          </fieldset>
        </div>
        <div className="mt-3 grid shrink-0 gap-3 border-t pt-3">
          <div className="flex items-center justify-between gap-2 text-sm" aria-live="polite">
            <span className="text-muted-foreground">Исключено за период</span>
            <span className="font-medium tabular">{formatMoney(draftTotal)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                apply(categories.filter((c) => draft.has(c.id)).map((c) => c.id));
                onOpenChange(false);
              }}
            >
              Применить
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}

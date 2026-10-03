"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, Search, SlidersHorizontal, X } from "lucide-react";

import { CategoryBadge } from "@/components/category-badge";
import { useTransactionSheet } from "@/components/transaction-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionSort } from "@/lib/queries";
import { cn } from "@/lib/utils";

const SORTS: { value: TransactionSort; label: string }[] = [
  { value: "date_desc", label: "Сначала новые" },
  { value: "date_asc", label: "Сначала старые" },
  { value: "amount_desc", label: "Сначала крупные" },
  { value: "amount_asc", label: "Сначала мелкие" },
];

type Props = {
  kind: "all" | "expense" | "income";
  categoryIds: string[];
  sort: TransactionSort;
  query: string;
};

export function TransactionFilters({ kind, categoryIds, sort, query }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { categories } = useTransactionSheet();
  const [search, setSearch] = useState(query);
  const [showCategories, setShowCategories] = useState(categoryIds.length > 0);

  function update(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  // Поиск с задержкой, чтобы не дёргать сервер на каждый символ.
  useEffect(() => {
    if (search === query) return;
    const id = setTimeout(() => update({ q: search.trim() || null }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const selected = new Set(categoryIds);
  const visibleCategories = categories.filter(
    (c) => (kind === "all" || c.kind === kind) && (!c.archived || selected.has(c.id)),
  );

  function toggleCategory(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update({ cat: [...next].join(",") || null });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-muted p-1">
          {(
            [
              ["all", "Все"],
              ["expense", "Расходы"],
              ["income", "Доходы"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ type: value === "all" ? null : value, cat: null })}
              className={cn(
                "h-8 rounded-lg px-3 text-sm text-muted-foreground transition-colors",
                kind === value && "bg-background font-medium text-foreground shadow-sm",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button
          variant={showCategories || selected.size ? "secondary" : "outline"}
          className="h-10 gap-2"
          onClick={() => setShowCategories((v) => !v)}
          aria-expanded={showCategories}
        >
          <SlidersHorizontal />
          Категории
          {selected.size > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">
              {selected.size}
            </span>
          )}
        </Button>

        <Select value={sort} onValueChange={(v) => update({ sort: v === "date_desc" ? null : v })}>
          <SelectTrigger className="h-10! gap-2" aria-label="Сортировка">
            <ArrowDownUp className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-full sm:w-auto sm:min-w-56 sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по комментарию"
            className="h-10 pl-9"
          />
        </div>
      </div>

      {showCategories && (
        <div className="flex flex-wrap gap-1.5">
          {visibleCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCategory(c.id)}
              aria-pressed={selected.has(c.id)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors hover:bg-muted",
                selected.has(c.id) && "border-primary/50 bg-accent text-accent-foreground",
              )}
            >
              <CategoryBadge
                icon={c.icon}
                color={c.color}
                size="sm"
                className="size-6 rounded-full"
              />
              {c.name}
              {kind === "all" && (
                <span className="text-xs text-muted-foreground">
                  {c.kind === "income" ? "доход" : ""}
                </span>
              )}
            </button>
          ))}
          {selected.size > 0 && (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => update({ cat: null })}>
              <X />
              Сбросить
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

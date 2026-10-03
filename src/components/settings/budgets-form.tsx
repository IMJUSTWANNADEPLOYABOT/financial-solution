"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { saveBudgets } from "@/actions/settings";
import { CategoryBadge } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Budget, Category } from "@/db/schema";
import { amountToInput, parseAmount } from "@/lib/money";

function MoneyInput(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        placeholder="Без лимита"
        className="h-10 pr-8 tabular"
        {...props}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
        ₽
      </span>
    </div>
  );
}

export function BudgetsForm({
  budgets,
  categories,
}: {
  budgets: Budget[];
  categories: Category[];
}) {
  const expenseCategories = categories.filter((c) => c.kind === "expense" && !c.archived);
  const initial = Object.fromEntries(
    budgets.map((b) => [b.categoryId ?? "total", amountToInput(b.amount)]),
  );
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Set<string>>(new Set());

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value.replace(/[^\d.,\s]/g, "") }));
    setErrors((e) => {
      const next = new Set(e);
      next.delete(key);
      return next;
    });
  }

  function save() {
    const invalid = new Set<string>();
    const amounts: Record<string, number | null> = {};
    for (const [key, raw] of Object.entries(values)) {
      if (!raw.trim()) {
        amounts[key] = null;
        continue;
      }
      const value = parseAmount(raw);
      if (value === null) invalid.add(key);
      amounts[key] = value;
    }
    if (invalid.size) {
      setErrors(invalid);
      toast.error("Проверь суммы");
      return;
    }

    startTransition(async () => {
      const result = await saveBudgets({
        total: amounts.total ?? null,
        categories: Object.entries(amounts)
          .filter(([key, v]) => key !== "total" && v !== null)
          .map(([categoryId, amount]) => ({ categoryId, amount: amount! })),
      });
      if (result.ok) toast.success("Лимиты сохранены");
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="budget-total">Общий лимит на месяц</Label>
        <MoneyInput
          id="budget-total"
          value={values.total ?? ""}
          onChange={(e) => set("total", e.target.value)}
          aria-invalid={errors.has("total")}
        />
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Лимиты по категориям</p>
        <ul className="grid gap-2">
          {expenseCategories.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <CategoryBadge icon={c.icon} color={c.color} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
              <div className="w-36">
                <MoneyInput
                  aria-label={`Лимит: ${c.name}`}
                  value={values[c.id] ?? ""}
                  onChange={(e) => set(c.id, e.target.value)}
                  aria-invalid={errors.has(c.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Button onClick={save} disabled={pending} className="h-10 justify-self-start px-4">
        {pending && <Loader2 className="animate-spin" />}
        Сохранить лимиты
      </Button>
    </div>
  );
}

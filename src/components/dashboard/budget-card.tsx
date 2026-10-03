import Link from "next/link";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { AlertTriangle, Settings2 } from "lucide-react";

import { CategoryBadge } from "@/components/category-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Category } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Status = {
  from: string;
  to: string;
  total: { limit: number; spent: number } | null;
  categories: { categoryId: string; limit: number; spent: number }[];
};

function Meter({ spent, limit }: { spent: number; limit: number }) {
  const ratio = spent / limit;
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={spent}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          ratio >= 1 ? "bg-destructive" : ratio >= 0.85 ? "bg-amber-500" : "bg-primary-strong",
        )}
        style={{ width: `${Math.min(ratio, 1) * 100}%` }}
      />
    </div>
  );
}

export function BudgetCard({
  status,
  categories,
  today,
}: {
  status: Status | null;
  categories: Category[];
  today: string;
}) {
  if (!status) {
    return (
      <Card className="flex-row items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-medium">Лимит на месяц не задан</p>
          <p className="text-xs text-muted-foreground">Установи лимит, чтобы следить за остатком</p>
        </div>
        <Link
          href="/settings#budgets"
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-strong hover:bg-accent"
        >
          Задать
        </Link>
      </Card>
    );
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  const month = format(
    parseISO(status.from),
    status.from.slice(0, 4) === today.slice(0, 4) ? "LLLL" : "LLLL yyyy",
    { locale: ru },
  );
  const isCurrentMonth = status.from <= today && today <= status.to;
  const daysLeft = isCurrentMonth
    ? differenceInCalendarDays(parseISO(status.to), parseISO(today)) + 1
    : 0;

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardTitle className="text-base">Лимиты · {month}</CardTitle>
        <Link
          href="/settings#budgets"
          aria-label="Настроить лимиты"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="size-4" />
        </Link>
      </CardHeader>

      <div className="grid gap-4 px-5">
        {status.total && (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-2xl font-semibold tracking-tight tabular">
                {formatMoney(Math.max(status.total.limit - status.total.spent, 0))}
              </span>
              <span className="text-xs text-muted-foreground tabular">
                из {formatMoney(status.total.limit)}
              </span>
            </div>
            <Meter spent={status.total.spent} limit={status.total.limit} />
            <p className="text-xs text-muted-foreground">
              {status.total.spent > status.total.limit ? (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  Перерасход {formatMoney(status.total.spent - status.total.limit)}
                </span>
              ) : isCurrentMonth ? (
                <>
                  Осталось · ≈{" "}
                  {formatMoney(Math.floor((status.total.limit - status.total.spent) / daysLeft))} в
                  день до конца месяца
                </>
              ) : (
                `Потрачено ${formatMoney(status.total.spent)}`
              )}
            </p>
          </div>
        )}

        {status.categories.length > 0 && (
          <ul className="grid gap-3">
            {status.categories
              .map((b) => ({ ...b, category: byId.get(b.categoryId) }))
              .filter((b) => b.category)
              .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
              .map((b) => (
                <li key={b.categoryId} className="flex items-center gap-3">
                  <CategoryBadge icon={b.category!.icon} color={b.category!.color} size="sm" />
                  <div className="grid min-w-0 flex-1 gap-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{b.category!.name}</span>
                      <span
                        className={cn(
                          "shrink-0 text-xs text-muted-foreground tabular",
                          b.spent > b.limit && "text-destructive",
                        )}
                      >
                        {formatMoney(b.spent)} / {formatMoney(b.limit)}
                      </span>
                    </div>
                    <Meter spent={b.spent} limit={b.limit} />
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

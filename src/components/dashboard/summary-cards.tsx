import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  expense: number;
  income: number;
  balance: number;
  days: number;
  filtered?: boolean;
  fullExpense?: number;
};

export function SummaryCards({ expense, income, balance, days, filtered, fullExpense }: Props) {
  const perDay = days > 1 ? Math.round(expense / days) : null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="gap-1 px-5 py-4 sm:col-span-1">
        <span className="text-sm text-muted-foreground">
          {filtered ? "Расходы с фильтром" : "Расходы"}
        </span>
        <span className="text-3xl font-semibold tracking-tight tabular">
          {formatMoney(expense)}
        </span>
        <span className="text-xs text-muted-foreground">
          {perDay !== null ? `≈ ${formatMoney(perDay)} в день` : " "}
        </span>
        {filtered && fullExpense !== undefined && (
          <div className="mt-2 grid gap-1 border-t pt-2 text-xs text-muted-foreground tabular">
            <span>Всего за период: {formatMoney(fullExpense)}</span>
            <span>Исключено: {formatMoney(fullExpense - expense)}</span>
          </div>
        )}
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
        <Card className="gap-1 px-5 py-4">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowDownRight className="size-4 text-success" aria-hidden />
            Доходы
          </span>
          <span className="text-xl font-semibold tracking-tight tabular sm:text-2xl">
            {formatMoney(income)}
          </span>
        </Card>
        <Card className="gap-1 px-5 py-4">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowUpRight
              className={cn("size-4", balance < 0 ? "text-destructive" : "text-primary-strong")}
              aria-hidden
            />
            {filtered ? "Баланс с фильтром" : "Баланс"}
          </span>
          <span
            className={cn(
              "text-xl font-semibold tracking-tight tabular sm:text-2xl",
              balance < 0 && "text-destructive",
            )}
          >
            {formatMoney(balance, { sign: true })}
          </span>
        </Card>
      </div>
    </div>
  );
}

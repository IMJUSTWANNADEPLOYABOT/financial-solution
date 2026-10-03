import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = { expense: number; income: number; balance: number; days: number };

export function SummaryCards({ expense, income, balance, days }: Props) {
  const perDay = days > 1 ? Math.round(expense / days) : null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="gap-1 px-5 py-4 sm:col-span-1">
        <span className="text-sm text-muted-foreground">Расходы</span>
        <span className="text-3xl font-semibold tracking-tight tabular">
          {formatMoney(expense)}
        </span>
        <span className="text-xs text-muted-foreground">
          {perDay !== null ? `≈ ${formatMoney(perDay)} в день` : " "}
        </span>
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
            Баланс
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

"use client";

import { CategoryBadge } from "@/components/category-badge";
import { useCategoryMap, useTransactionSheet } from "@/components/transaction-sheet";
import type { Transaction } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { formatDayLabel } from "@/lib/period";
import { cn } from "@/lib/utils";

type Props = {
  transactions: Transaction[];
  today: string;
  /** Группировать по дням с дневными итогами (имеет смысл только при сортировке по дате). */
  grouped?: boolean;
};

export function TransactionList({ transactions, today, grouped = true }: Props) {
  if (!grouped) {
    return (
      <ul className="divide-y divide-border/60">
        {transactions.map((t) => (
          <TransactionRow key={t.id} transaction={t} today={today} showDate />
        ))}
      </ul>
    );
  }

  const groups: { date: string; items: Transaction[]; expense: number; income: number }[] = [];
  for (const t of transactions) {
    let group = groups.at(-1);
    if (!group || group.date !== t.date) {
      group = { date: t.date, items: [], expense: 0, income: 0 };
      groups.push(group);
    }
    group.items.push(t);
    group[t.kind] += t.amount;
  }

  return (
    <div className="grid gap-5">
      {groups.map((g) => (
        <section key={g.date}>
          <header className="mb-1 flex items-baseline justify-between px-1 text-xs text-muted-foreground">
            <span className="font-medium">{formatDayLabel(g.date, today)}</span>
            <span className="tabular">
              {g.income > 0 && <span className="text-success">+{formatMoney(g.income)} · </span>}
              {g.expense > 0 && `−${formatMoney(g.expense)}`}
            </span>
          </header>
          <ul className="divide-y divide-border/60 rounded-xl border bg-card">
            {g.items.map((t) => (
              <TransactionRow key={t.id} transaction={t} today={today} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TransactionRow({
  transaction: t,
  today,
  showDate,
}: {
  transaction: Transaction;
  today: string;
  showDate?: boolean;
}) {
  const { open } = useTransactionSheet();
  const category = useCategoryMap().get(t.categoryId);

  return (
    <li>
      <button
        type="button"
        onClick={() => open({ transaction: t })}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
      >
        <CategoryBadge icon={category?.icon ?? "ellipsis"} color={category?.color ?? "#78716c"} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{category?.name ?? "Без категории"}</div>
          {(t.note || showDate) && (
            <div className="truncate text-xs text-muted-foreground">
              {showDate && formatDayLabel(t.date, today)}
              {showDate && t.note && " · "}
              {t.note}
            </div>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular",
            t.kind === "income" && "text-success",
          )}
        >
          {t.kind === "income" ? "+" : "−"}
          {formatMoney(t.amount)}
        </span>
      </button>
    </li>
  );
}

import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PeriodPicker } from "@/components/period-picker";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionList } from "@/components/transaction-list";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { parsePeriod, todayInTimezone } from "@/lib/period";
import { getTransactions, type TransactionSort } from "@/lib/queries";

export const metadata: Metadata = { title: "Операции" };

const SORTS: TransactionSort[] = ["date_desc", "date_asc", "amount_desc", "amount_asc"];

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const user = await requireUser();
  const today = todayInTimezone(user.timezone);
  const search = await searchParams;
  const period = parsePeriod(search, today);

  const str = (k: string) => (typeof search[k] === "string" ? (search[k] as string) : "");
  const kind =
    str("type") === "expense" || str("type") === "income"
      ? (str("type") as "expense" | "income")
      : "all";
  const sort = SORTS.includes(str("sort") as TransactionSort)
    ? (str("sort") as TransactionSort)
    : "date_desc";
  const categoryIds = str("cat").split(",").filter(Boolean);
  const query = str("q").slice(0, 100);

  const transactions = getTransactions(user.id, {
    from: period.from,
    to: period.to,
    kind: kind === "all" ? undefined : kind,
    categoryIds,
    query: query || undefined,
    sort,
  });

  const expense = transactions
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const income = transactions.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const filtered = kind !== "all" || categoryIds.length > 0 || query !== "";

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Операции</h1>
      <PeriodPicker period={period} today={today} />
      <TransactionFilters kind={kind} categoryIds={categoryIds} sort={sort} query={query} />

      {transactions.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm text-muted-foreground tabular">
          <span>
            {transactions.length}{" "}
            {plural(transactions.length, ["операция", "операции", "операций"])}
          </span>
          {expense > 0 && (
            <span>
              Расходы: <span className="font-medium text-foreground">{formatMoney(expense)}</span>
            </span>
          )}
          {income > 0 && (
            <span>
              Доходы: <span className="font-medium text-success">{formatMoney(income)}</span>
            </span>
          )}
        </div>
      )}

      {transactions.length === 0 ? (
        <EmptyState
          title={filtered ? "Ничего не найдено" : "За этот период операций нет"}
          hint={filtered ? "Попробуй изменить фильтры или период" : undefined}
        />
      ) : (
        <TransactionList
          transactions={transactions}
          today={today}
          grouped={sort.startsWith("date")}
        />
      )}
    </div>
  );
}

function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

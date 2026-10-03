import Link from "next/link";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight } from "lucide-react";

import { BudgetCard } from "@/components/dashboard/budget-card";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { SpendingChart, type SpendingPoint } from "@/components/dashboard/spending-chart";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { EmptyState } from "@/components/empty-state";
import { PeriodPicker } from "@/components/period-picker";
import { TransactionList } from "@/components/transaction-list";
import { requireUser } from "@/lib/auth";
import {
  eachDay,
  parsePeriod,
  periodContains,
  periodToSearch,
  todayInTimezone,
} from "@/lib/period";
import {
  getBudgetStatus,
  getCategories,
  getExpenseSeries,
  getSummary,
  getTransactions,
} from "@/lib/queries";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function buildSeries(
  rows: { key: string; total: number }[],
  from: string,
  to: string,
  bucket: "day" | "month",
): SpendingPoint[] {
  const totals = new Map(rows.map((r) => [r.key, r.total]));
  if (bucket === "day") {
    return eachDay(from, to).map((d) => ({
      key: d,
      label: format(parseISO(d), "d", { locale: ru }),
      tooltip: format(parseISO(d), "d MMMM, EEEEEE", { locale: ru }),
      total: totals.get(d) ?? 0,
    }));
  }
  const out: SpendingPoint[] = [];
  for (let m = from.slice(0, 7); m <= to.slice(0, 7);) {
    const date = parseISO(`${m}-01`);
    out.push({
      key: m,
      label: format(date, "LLL", { locale: ru }).replace(".", ""),
      tooltip: capitalize(format(date, "LLLL yyyy", { locale: ru })),
      total: totals.get(m) ?? 0,
    });
    const [y, mo] = m.split("-").map(Number);
    m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
  }
  return out;
}

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const today = todayInTimezone(user.timezone);
  const period = parsePeriod(await searchParams, today);

  const summary = getSummary(user.id, period.from, period.to);
  const categories = getCategories(user.id);
  // Лимиты считаются по месяцу выбранного периода (если он в одном месяце), иначе — по текущему.
  const budgetDate =
    period.from.slice(0, 7) === period.to.slice(0, 7) && !periodContains(period, today)
      ? period.from
      : today;
  const budgetStatus = getBudgetStatus(user.id, budgetDate);
  const recent = getTransactions(user.id, { from: period.from, to: period.to, limit: 6 });

  const days = differenceInCalendarDays(parseISO(period.to), parseISO(period.from)) + 1;
  const elapsedDays = periodContains(period, today)
    ? differenceInCalendarDays(parseISO(today), parseISO(period.from)) + 1
    : days;
  const bucket = days > 62 ? "month" : "day";
  const series =
    days > 1
      ? buildSeries(
          getExpenseSeries(user.id, period.from, period.to, bucket),
          period.from,
          period.to,
          bucket,
        )
      : null;

  const periodQuery = new URLSearchParams(periodToSearch(period)).toString();
  const isEmpty = summary.expense === 0 && summary.income === 0;

  return (
    <div className="grid gap-5">
      <PeriodPicker period={period} today={today} />

      <SummaryCards
        expense={summary.expense}
        income={summary.income}
        balance={summary.balance}
        days={elapsedDays}
      />

      {isEmpty ? (
        <EmptyState
          title="За этот период операций нет"
          hint="Добавь первую трату — это займёт пару секунд"
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="grid min-w-0 gap-5">
            <CategoryBreakdown
              expense={summary.expenseByCategory}
              income={summary.incomeByCategory}
              periodQuery={periodQuery}
            />
            {series && (
              <SpendingChart
                data={series}
                title={bucket === "day" ? "Расходы по дням" : "Расходы по месяцам"}
              />
            )}
          </div>
          <div className="grid content-start gap-5">
            <BudgetCard status={budgetStatus} categories={categories} today={today} />
            <section>
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold">Последние операции</h3>
                <Link
                  href={`/transactions?${periodQuery}`}
                  className="flex items-center text-xs text-primary hover:underline"
                >
                  Все
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
              <TransactionList transactions={recent} today={today} />
            </section>
          </div>
        </div>
      )}
      {isEmpty && <BudgetCard status={budgetStatus} categories={categories} today={today} />}
    </div>
  );
}

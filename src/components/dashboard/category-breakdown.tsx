"use client";

import { useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { CategoryBadge } from "@/components/category-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { formatMoney } from "@/lib/money";
import type { CategoryTotal } from "@/lib/queries";
import { cn } from "@/lib/utils";

const MAX_SLICES = 7;
const OTHER_COLOR = "var(--muted-foreground)";

type Props = {
  expense: CategoryTotal[];
  income: CategoryTotal[];
  /** Параметры периода, чтобы переход в список операций сохранял выбранный период. */
  periodQuery: string;
};

function toSlices(items: CategoryTotal[]) {
  if (items.length <= MAX_SLICES + 1) return items.map((i) => ({ ...i, key: i.categoryId }));
  const head = items.slice(0, MAX_SLICES);
  const rest = items.slice(MAX_SLICES);
  return [
    ...head.map((i) => ({ ...i, key: i.categoryId })),
    {
      key: "other",
      categoryId: "",
      name: `Остальное (${rest.length})`,
      icon: "ellipsis",
      color: OTHER_COLOR,
      total: rest.reduce((s, i) => s + i.total, 0),
      count: rest.reduce((s, i) => s + i.count, 0),
    },
  ];
}

export function CategoryBreakdown({ expense, income, periodQuery }: Props) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const items = kind === "expense" ? expense : income;
  const total = items.reduce((s, i) => s + i.total, 0);
  const slices = toSlices(items);
  const [active, setActive] = useState<string | null>(null);
  const activeSlice = slices.find((s) => s.key === active);

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-5">
        <CardTitle className="text-base">По категориям</CardTitle>
        <div className="flex rounded-lg bg-muted p-0.5 text-xs">
          {(["expense", "income"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "rounded-md px-2.5 py-1 text-muted-foreground",
                kind === k && "bg-background font-medium text-foreground shadow-sm",
              )}
            >
              {k === "expense" ? "Расходы" : "Доходы"}
            </button>
          ))}
        </div>
      </CardHeader>

      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          {kind === "expense" ? "Расходов за период нет" : "Доходов за период нет"}
        </p>
      ) : (
        <div className="grid items-center gap-6 px-5 sm:grid-cols-[13rem_1fr]">
          <div className="relative mx-auto aspect-square w-52">
            <ChartContainer config={{}} className="aspect-square h-full w-full">
              <PieChart>
                <Tooltip
                  cursor={false}
                  content={({ active: on, payload }) => {
                    const item = payload?.[0]?.payload as (typeof slices)[number] | undefined;
                    if (!on || !item) return null;
                    return (
                      <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-muted-foreground tabular">
                          {formatMoney(item.total)} · {Math.round((item.total / total) * 100)}%
                        </div>
                      </div>
                    );
                  }}
                />
                <Pie
                  data={slices}
                  dataKey="total"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="100%"
                  paddingAngle={slices.length > 1 ? 1.5 : 0}
                  cornerRadius={4}
                  stroke={slices.length > 1 ? "var(--card)" : "none"}
                  strokeWidth={2}
                  isAnimationActive={false}
                  onMouseEnter={(_, i) => setActive(slices[i]?.key ?? null)}
                  onMouseLeave={() => setActive(null)}
                >
                  {slices.map((s) => (
                    <Cell
                      key={s.key}
                      fill={s.color}
                      opacity={active && active !== s.key ? 0.35 : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="max-w-[7.5rem] truncate text-xs text-muted-foreground">
                {activeSlice ? activeSlice.name : "Всего"}
              </span>
              <span className="text-lg font-semibold tracking-tight tabular">
                {formatMoney(activeSlice ? activeSlice.total : total)}
              </span>
            </div>
          </div>

          <ul className="grid gap-1">
            {items.map((item) => {
              const share = item.total / total;
              const params = new URLSearchParams(periodQuery);
              params.set("cat", item.categoryId);
              return (
                <li key={item.categoryId}>
                  <Link
                    href={`/transactions?${params}`}
                    onMouseEnter={() =>
                      setActive(
                        slices.some((s) => s.key === item.categoryId) ? item.categoryId : "other",
                      )
                    }
                    onMouseLeave={() => setActive(null)}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
                  >
                    <CategoryBadge icon={item.icon} color={item.color} size="sm" />
                    <div className="grid min-w-0 flex-1 gap-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">{item.name}</span>
                        <span className="shrink-0 font-medium tabular">
                          {formatMoney(item.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(share * 100, 1.5)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs text-muted-foreground tabular">
                          {Math.round(share * 100)}%
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

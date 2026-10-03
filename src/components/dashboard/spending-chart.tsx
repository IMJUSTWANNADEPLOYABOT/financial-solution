"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export type SpendingPoint = { key: string; label: string; tooltip: string; total: number };

export function SpendingChart({ data, title }: { data: SpendingPoint[]; title: string }) {
  const hasData = data.some((d) => d.total > 0);

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      {hasData ? (
        <ChartContainer config={{}} className="aspect-auto h-48 w-full px-2">
          <BarChart
            data={data}
            margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={12}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => formatMoneyCompact(v)}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as SpendingPoint | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <div className="text-muted-foreground">{point.tooltip}</div>
                    <div className="font-medium tabular">{formatMoney(point.total)}</div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="total"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          Нет расходов за период
        </p>
      )}
    </Card>
  );
}

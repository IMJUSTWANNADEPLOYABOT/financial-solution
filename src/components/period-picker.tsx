"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ru } from "react-day-picker/locale";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  buildPeriod,
  fromISODate,
  periodContains,
  periodToSearch,
  shiftPeriod,
  toISODate,
  PERIOD_KINDS,
  type Period,
  type PeriodKind,
} from "@/lib/period";
import { cn } from "@/lib/utils";

export function PeriodPicker({ period, today }: { period: Period; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: fromISODate(period.from),
    to: fromISODate(period.to),
  });

  function go(next: Period) {
    const params = new URLSearchParams(searchParams);
    for (const key of ["p", "d", "from", "to"]) params.delete(key);
    for (const [k, v] of Object.entries(periodToSearch(next))) params.set(k, v);
    router.push(`${pathname}?${params}`, { scroll: false });
  }

  function selectKind(kind: PeriodKind) {
    if (kind === "custom") {
      setRangeOpen(true);
      return;
    }
    // Переключаясь между пресетами, остаёмся рядом с текущей опорной датой.
    const anchor = periodContains(period, today) ? today : period.anchor;
    go(buildPeriod(kind, anchor, today));
  }

  const atPresent = period.kind !== "custom" && periodContains(period, today);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Предыдущий период"
          onClick={() => go(shiftPeriod(period, -1, today))}
        >
          <ChevronLeft />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold sm:flex-none sm:px-1 sm:text-lg">
          {period.label}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Следующий период"
          disabled={atPresent}
          onClick={() => go(shiftPeriod(period, 1, today))}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {PERIOD_KINDS.map(({ value, label }) =>
          value === "custom" ? (
            <Popover key={value} open={rangeOpen} onOpenChange={setRangeOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={() => selectKind("custom")}
                  className={cn(
                    "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm whitespace-nowrap text-muted-foreground transition-colors sm:flex-none",
                    period.kind === value && "bg-background font-medium text-foreground shadow-sm",
                  )}
                >
                  <CalendarRange className="size-3.5" />
                  <span className="sr-only sm:not-sr-only">{label}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="range"
                  locale={ru}
                  numberOfMonths={isDesktop ? 2 : 1}
                  defaultMonth={range?.from}
                  selected={range}
                  onSelect={setRange}
                />
                <div className="flex justify-end gap-2 border-t p-3">
                  <Button variant="ghost" size="sm" onClick={() => setRangeOpen(false)}>
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    disabled={!range?.from}
                    onClick={() => {
                      if (!range?.from) return;
                      const from = toISODate(range.from);
                      const to = toISODate(range.to ?? range.from);
                      go(buildPeriod("custom", from, today, { from, to }));
                      setRangeOpen(false);
                    }}
                  >
                    Применить
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <button
              key={value}
              type="button"
              onClick={() => selectKind(value)}
              className={cn(
                "h-8 flex-1 rounded-lg px-3 text-sm whitespace-nowrap text-muted-foreground transition-colors sm:flex-none",
                period.kind === value && "bg-background font-medium text-foreground shadow-sm",
              )}
            >
              {label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

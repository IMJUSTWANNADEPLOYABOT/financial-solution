import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ru } from "date-fns/locale";

export type PeriodKind = "day" | "week" | "month" | "year" | "custom";

export type Period = {
  kind: PeriodKind;
  /** Опорная дата для пресетов (YYYY-MM-DD). */
  anchor: string;
  from: string;
  to: string;
  label: string;
};

export const PERIOD_KINDS: { value: PeriodKind; label: string }[] = [
  { value: "day", label: "День" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
  { value: "custom", label: "Период" },
];

const ISO = "yyyy-MM-dd";

export const toISODate = (d: Date) => format(d, ISO);
export const fromISODate = (s: string) => parseISO(s);

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(parseISO(s));
}

/** Сегодняшняя дата в часовом поясе пользователя. */
export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatDayLabel(iso: string, today: string) {
  const diff = differenceInCalendarDays(parseISO(today), parseISO(iso));
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return format(parseISO(iso), sameYear ? "d MMMM, EEEEEE" : "d MMMM yyyy", { locale: ru });
}

function rangeLabel(from: Date, to: Date) {
  const sameYear = from.getFullYear() === to.getFullYear();
  const left = format(from, sameYear ? "d MMM" : "d MMM yyyy", { locale: ru });
  const right = format(to, "d MMM yyyy", { locale: ru });
  return `${left} – ${right}`;
}

export function buildPeriod(
  kind: PeriodKind,
  anchor: string,
  today: string,
  range?: { from: string; to: string },
): Period {
  const a = parseISO(anchor);
  switch (kind) {
    case "day":
      return { kind, anchor, from: anchor, to: anchor, label: formatDayLabel(anchor, today) };
    case "week": {
      const from = startOfWeek(a, { weekStartsOn: 1 });
      const to = endOfWeek(a, { weekStartsOn: 1 });
      return {
        kind,
        anchor,
        from: toISODate(from),
        to: toISODate(to),
        label: rangeLabel(from, to),
      };
    }
    case "month": {
      const from = startOfMonth(a);
      return {
        kind,
        anchor,
        from: toISODate(from),
        to: toISODate(endOfMonth(a)),
        label: capitalize(format(a, "LLLL yyyy", { locale: ru })),
      };
    }
    case "year":
      return {
        kind,
        anchor,
        from: toISODate(startOfYear(a)),
        to: toISODate(endOfYear(a)),
        label: format(a, "yyyy"),
      };
    case "custom": {
      const from = range?.from ?? anchor;
      const to = range?.to ?? anchor;
      return { kind, anchor: from, from, to, label: rangeLabel(parseISO(from), parseISO(to)) };
    }
  }
}

type Search = Record<string, string | string[] | undefined>;

/** Разбирает период из search-параметров: ?p=month&d=2026-10-03 или ?p=custom&from=…&to=… */
export function parsePeriod(search: Search, today: string): Period {
  const get = (k: string) => (typeof search[k] === "string" ? (search[k] as string) : undefined);
  const kindRaw = get("p");
  const kind: PeriodKind = PERIOD_KINDS.some((k) => k.value === kindRaw)
    ? (kindRaw as PeriodKind)
    : "month";

  if (kind === "custom") {
    let from = get("from");
    let to = get("to");
    if (isISODate(from) && isISODate(to)) {
      if (from > to) [from, to] = [to, from];
      return buildPeriod("custom", from, today, { from, to });
    }
    return buildPeriod("month", today, today);
  }

  const d = get("d");
  return buildPeriod(kind, isISODate(d) ? d : today, today);
}

/** Сдвигает пресетный период на шаг вперёд/назад. Для кастомного — на его длину. */
export function shiftPeriod(period: Period, dir: 1 | -1, today: string): Period {
  const a = parseISO(period.anchor);
  switch (period.kind) {
    case "day":
      return buildPeriod("day", toISODate(addDays(a, dir)), today);
    case "week":
      return buildPeriod("week", toISODate(addWeeks(a, dir)), today);
    case "month":
      return buildPeriod("month", toISODate(addMonths(a, dir)), today);
    case "year":
      return buildPeriod("year", toISODate(addYears(a, dir)), today);
    case "custom": {
      const len = differenceInCalendarDays(parseISO(period.to), parseISO(period.from)) + 1;
      const from = toISODate(addDays(parseISO(period.from), dir * len));
      const to = toISODate(addDays(parseISO(period.to), dir * len));
      return buildPeriod("custom", from, today, { from, to });
    }
  }
}

export function periodToSearch(period: Period): Record<string, string> {
  if (period.kind === "custom") return { p: "custom", from: period.from, to: period.to };
  return { p: period.kind, d: period.anchor };
}

/** Содержит ли период сегодняшний день — тогда шаг «вперёд» не нужен. */
export function periodContains(period: Period, date: string) {
  return period.from <= date && date <= period.to;
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = parseISO(from); toISODate(d) <= to; d = addDays(d, 1)) out.push(toISODate(d));
  return out;
}

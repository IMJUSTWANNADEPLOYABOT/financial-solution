"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { addDays, format } from "date-fns";
import { ru } from "date-fns/locale";
import { ru as dayPickerRu } from "react-day-picker/locale";
import { CalendarDays, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createTransaction,
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
} from "@/actions/transactions";
import { CategoryBadge } from "@/components/category-badge";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Category, Transaction, TransactionKind } from "@/db/schema";
import { amountToInput, formatMoney, parseAmount } from "@/lib/money";
import { fromISODate, toISODate, todayInTimezone } from "@/lib/period";
import { cn } from "@/lib/utils";

type OpenOptions = { transaction?: Transaction; kind?: TransactionKind };

type ContextValue = {
  open: (options?: OpenOptions) => void;
  categories: Category[];
  timezone: string;
};

const TransactionSheetContext = createContext<ContextValue | null>(null);

export function useTransactionSheet() {
  const ctx = use(TransactionSheetContext);
  if (!ctx) throw new Error("useTransactionSheet must be used inside TransactionSheetProvider");
  return ctx;
}

export function useCategoryMap() {
  const { categories } = useTransactionSheet();
  return useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
}

export function TransactionSheetProvider({
  categories,
  timezone,
  children,
}: {
  categories: Category[];
  timezone: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<{ open: boolean; options: OpenOptions; key: number }>({
    open: false,
    options: {},
    key: 0,
  });

  const open = useCallback((options: OpenOptions = {}) => {
    setState((s) => ({ open: true, options, key: s.key + 1 }));
  }, []);

  // Горячая клавиша N на ПК — быстрое добавление.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable], [role=dialog]")) return;
      if (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "т") {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        open();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const value = useMemo(() => ({ open, categories, timezone }), [open, categories, timezone]);
  const editing = state.options.transaction;

  return (
    <TransactionSheetContext value={value}>
      {children}
      <ResponsiveModal
        open={state.open}
        onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}
        title={editing ? "Редактирование" : "Новая операция"}
      >
        <TransactionForm
          key={state.key}
          options={state.options}
          categories={categories}
          timezone={timezone}
          onDone={() => setState((s) => ({ ...s, open: false }))}
        />
      </ResponsiveModal>
    </TransactionSheetContext>
  );
}

function TransactionForm({
  options,
  categories,
  timezone,
  onDone,
}: {
  options: OpenOptions;
  categories: Category[];
  timezone: string;
  onDone: () => void;
}) {
  const tx = options.transaction;
  const today = useMemo(() => todayInTimezone(timezone), [timezone]);
  const yesterday = toISODate(addDays(fromISODate(today), -1));

  const [kind, setKind] = useState<TransactionKind>(tx?.kind ?? options.kind ?? "expense");
  const [amount, setAmount] = useState(tx ? amountToInput(tx.amount) : "");
  const [categoryId, setCategoryId] = useState<string | null>(tx?.categoryId ?? null);
  const [date, setDate] = useState(tx?.date ?? today);
  const [note, setNote] = useState(tx?.note ?? "");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  const visible = categories.filter(
    (c) => c.kind === kind && (!c.archived || c.id === tx?.categoryId),
  );

  function submit(selectedCategoryId = categoryId) {
    const value = parseAmount(amount);
    if (!value) {
      setAmountError("Введи сумму");
      amountRef.current?.focus();
      return;
    }
    if (!selectedCategoryId) {
      toast.error("Выбери категорию");
      return;
    }
    const payload = { kind, amount: value, categoryId: selectedCategoryId, date, note };
    startTransition(async () => {
      const result = tx
        ? await updateTransaction(tx.id, payload)
        : await createTransaction(payload);
      if (!result.ok) {
        toast.error(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.error);
        return;
      }
      const category = categories.find((c) => c.id === selectedCategoryId);
      toast.success(tx ? "Изменения сохранены" : `${formatMoney(value)} · ${category?.name ?? ""}`);
      onDone();
    });
  }

  function remove() {
    if (!tx) return;
    startTransition(async () => {
      const result = await deleteTransaction(tx.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onDone();
      toast("Операция удалена", {
        action: {
          label: "Отменить",
          onClick: async () => {
            const restored = await restoreTransaction(result.data!);
            if (!restored.ok) toast.error(restored.error);
          },
        },
      });
    });
  }

  function onCategoryClick(id: string) {
    setCategoryId(id);
    // При создании тап по категории сразу сохраняет запись — минимум касаний.
    if (!tx && parseAmount(amount)) submit(id);
    else if (!tx) {
      setAmountError("Введи сумму");
      amountRef.current?.focus();
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => {
              setKind(k);
              setCategoryId(null);
            }}
            className={cn(
              "h-9 rounded-lg text-sm font-medium text-muted-foreground transition-colors",
              kind === k && "bg-background text-foreground shadow-sm",
            )}
          >
            {k === "expense" ? "Расход" : "Доход"}
          </button>
        ))}
      </div>

      <div>
        <div
          className={cn(
            "flex items-baseline gap-2 border-b-2 border-border pb-1 transition-colors focus-within:border-primary-strong",
            amountError && "border-destructive focus-within:border-destructive",
          )}
        >
          <input
            ref={amountRef}
            autoFocus
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="0"
            aria-label="Сумма"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^\d.,\s]/g, ""));
              setAmountError(null);
            }}
            className="w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight tabular outline-none placeholder:text-muted-foreground/40"
          />
          <span className="text-3xl font-medium text-muted-foreground">₽</span>
        </div>
        {amountError && <p className="mt-1 text-sm text-destructive">{amountError}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: today, label: "Сегодня" },
          { value: yesterday, label: "Вчера" },
        ].map((d) => (
          <Button
            key={d.value}
            type="button"
            size="sm"
            variant={date === d.value ? "secondary" : "ghost"}
            className={cn("h-8 rounded-full px-3", date === d.value && "text-primary-strong")}
            onClick={() => setDate(d.value)}
          >
            {d.label}
          </Button>
        ))}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant={date !== today && date !== yesterday ? "secondary" : "ghost"}
              className={cn(
                "h-8 rounded-full px-3",
                date !== today && date !== yesterday && "text-primary-strong",
              )}
            >
              <CalendarDays />
              {date !== today && date !== yesterday
                ? format(fromISODate(date), "d MMM yyyy", { locale: ru })
                : "Дата"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={dayPickerRu}
              selected={fromISODate(date)}
              defaultMonth={fromISODate(date)}
              onSelect={(d) => {
                if (d) setDate(toISODate(d));
                setCalendarOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Комментарий"
        maxLength={200}
        className="h-10"
      />

      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          {tx ? "Категория" : "Выбери категорию — запись сохранится сразу"}
        </p>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-4">
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={pending}
              onClick={() => onCategoryClick(c.id)}
              aria-pressed={categoryId === c.id}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border border-transparent px-1 py-2 text-center transition-colors hover:bg-muted disabled:opacity-60",
                categoryId === c.id && "border-primary-strong/40 bg-accent",
              )}
            >
              <CategoryBadge icon={c.icon} color={c.color} size="lg" />
              <span className="line-clamp-2 text-[11px] leading-tight">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        {tx && (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="h-11"
            disabled={pending}
            onClick={remove}
            aria-label="Удалить"
          >
            <Trash2 />
          </Button>
        )}
        <Button type="submit" size="lg" className="h-11 flex-1 text-base" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Сохранить
        </Button>
      </div>
    </form>
  );
}

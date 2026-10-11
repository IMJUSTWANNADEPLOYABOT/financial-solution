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
import { Dialog as DialogPrimitive } from "radix-ui";
import { ru as dayPickerRu } from "react-day-picker/locale";
import { CalendarDays, Check, Delete, Loader2, MessageSquare, Trash2, X } from "lucide-react";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  type AmountKey,
  evaluateAmount,
  formatAmountExpression,
  hasOperator,
  pressAmountKey,
} from "@/lib/amount-expression";
import { amountToInput, formatMoney } from "@/lib/money";
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
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
  const onOpenChange = (o: boolean) => setState((s) => ({ ...s, open: o }));
  const formProps = {
    options: state.options,
    categories,
    timezone,
    onDone: () => onOpenChange(false),
  };

  return (
    <TransactionSheetContext value={value}>
      {children}
      {isDesktop ? (
        <ResponsiveModal
          open={state.open}
          onOpenChange={onOpenChange}
          title={state.options.transaction ? "Редактирование" : "Новая операция"}
          className="sm:max-w-3xl md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto"
        >
          <DesktopForm key={state.key} {...formProps} />
        </ResponsiveModal>
      ) : (
        // На телефоне — экран на весь размер со своей цифровой клавиатурой. Системная клавиатура
        // сдвигала шторку и закрывала сумму, а смахивание вниз закрывало форму целиком.
        <DialogPrimitive.Root open={state.open} onOpenChange={onOpenChange}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Content
              aria-describedby={undefined}
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="fixed inset-0 z-50 flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)] outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-6 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-6"
            >
              <MobileForm key={state.key} {...formProps} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </TransactionSheetContext>
  );
}

const KIND_TITLE: Record<TransactionKind, string> = {
  expense: "Новый расход",
  income: "Новый доход",
};

type FormProps = {
  options: OpenOptions;
  categories: Category[];
  timezone: string;
  onDone: () => void;
};

/** Состояние и действия формы — общие для ПК и телефона, отличается только раскладка. */
function useTransactionDraft({ options, categories, timezone, onDone }: FormProps) {
  const tx = options.transaction;
  const today = useMemo(() => todayInTimezone(timezone), [timezone]);

  const [kind, setKindState] = useState<TransactionKind>(tx?.kind ?? options.kind ?? "expense");
  const [amount, setAmountState] = useState(tx ? amountToInput(tx.amount) : "");
  const [categoryId, setCategoryId] = useState<string | null>(tx?.categoryId ?? null);
  const [date, setDate] = useState(tx?.date ?? today);
  const [note, setNote] = useState(tx?.note ?? "");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = categories.filter(
    (c) => c.kind === kind && (!c.archived || c.id === tx?.categoryId),
  );

  function setKind(k: TransactionKind) {
    setKindState(k);
    setCategoryId(null);
  }

  function setAmount(value: string) {
    setAmountState(value);
    setAmountError(null);
  }

  /** Возвращает false, если не хватает суммы — чтобы раскладка могла показать, куда её вводить. */
  function submit(selectedCategoryId = categoryId): boolean {
    const value = evaluateAmount(amount);
    if (!value) {
      setAmountError("Введи сумму");
      return false;
    }
    if (!selectedCategoryId) {
      toast.error("Выбери категорию");
      return true;
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
    return true;
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

  /** При создании тап по категории сразу сохраняет запись — минимум касаний. */
  function pickCategory(id: string): boolean {
    setCategoryId(id);
    if (tx) return true;
    if (evaluateAmount(amount)) return submit(id);
    setAmountError("Введи сумму");
    return false;
  }

  return {
    tx,
    today,
    kind,
    setKind,
    amount,
    setAmount,
    amountError,
    categoryId,
    date,
    setDate,
    note,
    setNote,
    pending,
    visible,
    submit,
    remove,
    pickCategory,
  };
}

type Draft = ReturnType<typeof useTransactionDraft>;

function DesktopForm(props: FormProps) {
  const draft = useTransactionDraft(props);
  const { tx, kind, amount, amountError, pending } = draft;
  const amountRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 gap-x-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.submit()) amountRef.current?.focus();
      }}
    >
      {/* Слева поля и кнопки, справа категории — так окно ниже и помещается на небольших экранах. */}
      <div className="col-start-1 row-start-1 grid content-start gap-4">
        <KindToggle kind={kind} onChange={draft.setKind} />

        <div>
          <div
            className={cn(
              "flex items-baseline gap-2 border-b-2 border-border pb-1 transition-colors focus-within:border-primary-strong",
              amountError && "border-destructive focus-within:border-destructive",
            )}
          >
            <input
              ref={amountRef}
              autoFocus={!tx}
              inputMode="decimal"
              enterKeyHint="done"
              placeholder="0"
              aria-label="Сумма"
              value={amount}
              onChange={(e) => draft.setAmount(e.target.value.replace(/[^\d.,\s+-]/g, ""))}
              className="w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight tabular outline-none placeholder:text-muted-foreground/40"
            />
            <span className="text-3xl font-medium text-muted-foreground">₽</span>
          </div>
          {amountError && <p className="mt-1 text-sm text-destructive">{amountError}</p>}
        </div>

        <DateChips draft={draft} />

        <Input
          value={draft.note}
          onChange={(e) => draft.setNote(e.target.value)}
          placeholder="Комментарий"
          maxLength={200}
          className="h-10"
        />
      </div>

      <div className="col-start-2 row-span-2 row-start-1">
        <p className="mb-2 text-xs text-muted-foreground">
          {tx ? "Категория" : "Выбери категорию — запись сохранится сразу"}
        </p>
        <CategoryGrid
          draft={draft}
          className="grid-cols-5"
          onPick={(id) => {
            if (!draft.pickCategory(id)) amountRef.current?.focus();
          }}
        />
      </div>

      <div className="col-start-1 row-start-2 flex gap-2 self-end pt-1">
        {tx && (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="h-11"
            disabled={pending}
            onClick={draft.remove}
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

const KEYPAD: AmountKey[] = ["1", "2", "3", "backspace", "4", "5", "6", "+", "7", "8", "9", "-"];
const KEYPAD_LAST_ROW: AmountKey[] = [",", "0", "000"];

function MobileForm(props: FormProps) {
  const draft = useTransactionDraft(props);
  const { tx, kind, amount, amountError, pending } = draft;
  const kindPreset = !tx && !!props.options.kind;
  const title = tx ? "Редактирование" : kindPreset ? KIND_TITLE[kind] : "Новая операция";
  const expression = hasOperator(amount);
  const total = evaluateAmount(amount);

  function press(key: AmountKey) {
    draft.setAmount(pressAmountKey(amount, key));
  }

  function confirm() {
    // С выражением «150+320» клавиша работает как «=», дальше — как «Сохранить».
    if (expression) {
      if (total) draft.setAmount(amountToInput(total));
      return;
    }
    draft.submit();
  }

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 px-2">
        <DialogPrimitive.Close asChild>
          <Button variant="ghost" size="icon" aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </DialogPrimitive.Close>
        <DialogPrimitive.Title className="flex-1 text-center font-medium">
          {title}
        </DialogPrimitive.Title>
        {tx ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            aria-label="Удалить"
            disabled={pending}
            onClick={draft.remove}
          >
            <Trash2 className="size-5" />
          </Button>
        ) : (
          <span className="size-9" />
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 px-4 pb-3">
        {!kindPreset && <KindToggle kind={kind} onChange={draft.setKind} />}

        {/* Сумма: не поле ввода, а табло — системная клавиатура не появляется. */}
        <div
          aria-live="polite"
          aria-label="Сумма"
          className={cn(
            "flex min-h-[4.5rem] flex-col items-end justify-end border-b-2 border-primary-strong pb-1",
            amountError && "border-destructive",
          )}
        >
          {expression && (
            <span className="text-sm text-muted-foreground tabular">
              = {total ? formatMoney(total) : "…"}
            </span>
          )}
          <div className="flex w-full items-baseline justify-end gap-2">
            <span
              className={cn(
                "min-w-0 truncate text-right font-semibold tracking-tight tabular [direction:rtl]",
                amount.length > 12 ? "text-3xl" : "text-4xl",
                !amount && "text-muted-foreground/40",
              )}
            >
              {/* direction:rtl обрезает длинное выражение слева, но знаки должны идти по порядку. */}
              <bdi>{amount ? formatAmountExpression(amount) : "0"}</bdi>
            </span>
            <span className="text-3xl font-medium text-muted-foreground">₽</span>
          </div>
        </div>
        {amountError && <p className="-mt-2 text-sm text-destructive">{amountError}</p>}

        <DateChips draft={draft} />

        <label className="flex h-10 items-center gap-2 rounded-lg border px-3 focus-within:border-ring">
          <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={draft.note}
            onChange={(e) => draft.setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            enterKeyHint="done"
            placeholder="Комментарий"
            maxLength={200}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t px-3 py-2">
        <p className="mb-1.5 px-1 text-xs text-muted-foreground">
          {tx ? "Категория" : "Выбери категорию — запись сохранится сразу"}
        </p>
        <CategoryGrid draft={draft} className="grid-cols-4" onPick={draft.pickCategory} />
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-1.5 border-t bg-muted/50 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {KEYPAD.map((key) => (
          <Key key={key} value={key} onPress={press} />
        ))}
        {KEYPAD_LAST_ROW.map((key) => (
          <Key key={key} value={key} onPress={press} />
        ))}
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          aria-label={expression ? "Посчитать" : "Сохранить"}
          className="flex h-13 touch-manipulation items-center justify-center rounded-xl bg-primary text-2xl font-medium text-primary-foreground transition-transform select-none active:scale-95 disabled:opacity-60 [@media(max-height:700px)]:h-11"
        >
          {pending ? (
            <Loader2 className="size-6 animate-spin" />
          ) : expression ? (
            "="
          ) : (
            <Check className="size-6" strokeWidth={2.6} />
          )}
        </button>
      </div>
    </>
  );
}

const KEY_LABEL: Partial<Record<AmountKey, string>> = { "-": "−" };

function Key({ value, onPress }: { value: AmountKey; onPress: (key: AmountKey) => void }) {
  const isOperator = value === "+" || value === "-" || value === "backspace";
  return (
    <button
      type="button"
      onClick={() => onPress(value)}
      aria-label={value === "backspace" ? "Стереть" : undefined}
      className={cn(
        "flex h-13 touch-manipulation items-center justify-center rounded-xl bg-background text-2xl font-medium shadow-xs transition-transform select-none active:scale-95 active:bg-accent [@media(max-height:700px)]:h-11",
        isOperator && "bg-transparent text-primary-strong shadow-none",
      )}
    >
      {value === "backspace" ? <Delete className="size-6" /> : (KEY_LABEL[value] ?? value)}
    </button>
  );
}

function KindToggle({
  kind,
  onChange,
}: {
  kind: TransactionKind;
  onChange: (kind: TransactionKind) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup">
      {(["expense", "income"] as const).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={kind === k}
          onClick={() => onChange(k)}
          className={cn(
            "h-9 rounded-lg text-sm font-medium text-muted-foreground transition-colors",
            kind === k && "bg-background text-foreground shadow-sm",
          )}
        >
          {k === "expense" ? "Расход" : "Доход"}
        </button>
      ))}
    </div>
  );
}

function DateChips({ draft }: { draft: Draft }) {
  const { today, date, setDate } = draft;
  const yesterday = toISODate(addDays(fromISODate(today), -1));
  const custom = date !== today && date !== yesterday;
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
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
            variant={custom ? "secondary" : "ghost"}
            className={cn("h-8 rounded-full px-3", custom && "text-primary-strong")}
          >
            <CalendarDays />
            {custom ? format(fromISODate(date), "d MMM yyyy", { locale: ru }) : "Дата"}
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
  );
}

function CategoryGrid({
  draft,
  className,
  onPick,
}: {
  draft: Draft;
  className?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {draft.visible.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={draft.pending}
          onClick={() => onPick(c.id)}
          aria-pressed={draft.categoryId === c.id}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border border-transparent px-1 py-2 text-center transition-colors hover:bg-muted disabled:opacity-60",
            draft.categoryId === c.id && "border-primary-strong/40 bg-accent",
          )}
        >
          <CategoryBadge icon={c.icon} color={c.color} size="lg" />
          <span className="line-clamp-2 text-[11px] leading-tight">{c.name}</span>
        </button>
      ))}
    </div>
  );
}

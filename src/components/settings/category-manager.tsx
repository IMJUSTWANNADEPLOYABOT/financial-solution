"use client";

import { useState, useTransition } from "react";
import { EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createCategory,
  deleteCategory,
  setCategoryArchived,
  updateCategory,
} from "@/actions/categories";
import { CategoryBadge } from "@/components/category-badge";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Category, TransactionKind } from "@/db/schema";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/lib/category-icons";
import { CATEGORY_COLORS } from "@/lib/default-categories";
import { cn } from "@/lib/utils";

type Editing = { category?: Category; kind: TransactionKind } | null;

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [editing, setEditing] = useState<Editing>(null);
  const [modalKey, setModalKey] = useState(0);
  const list = categories.filter((c) => c.kind === kind);

  function openEditor(category?: Category) {
    setEditing({ category, kind });
    setModalKey((k) => k + 1);
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-xl bg-muted p-1">
          {(["expense", "income"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "h-8 rounded-lg px-3 text-sm text-muted-foreground",
                kind === k && "bg-background font-medium text-foreground shadow-sm",
              )}
            >
              {k === "expense" ? "Расходы" : "Доходы"}
            </button>
          ))}
        </div>
        <Button variant="outline" className="h-9" onClick={() => openEditor()}>
          <Plus />
          Новая
        </Button>
      </div>

      <ul className="divide-y divide-border/60 rounded-xl border">
        {list.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => openEditor(c)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                c.archived && "opacity-55",
              )}
            >
              <CategoryBadge icon={c.icon} color={c.color} />
              <span className="flex-1 truncate text-sm">{c.name}</span>
              {c.archived && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <EyeOff className="size-3.5" />
                  Скрыта
                </span>
              )}
              <Pencil className="size-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>

      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.category ? "Категория" : "Новая категория"}
      >
        {editing && (
          <CategoryEditor key={modalKey} editing={editing} onDone={() => setEditing(null)} />
        )}
      </ResponsiveModal>
    </div>
  );
}

function CategoryEditor({
  editing,
  onDone,
}: {
  editing: NonNullable<Editing>;
  onDone: () => void;
}) {
  const c = editing.category;
  const [name, setName] = useState(c?.name ?? "");
  const [icon, setIcon] = useState(c?.icon ?? "ellipsis");
  const [color, setColor] = useState(c?.color ?? CATEGORY_COLORS[0]);
  const [archived, setArchived] = useState(c?.archived ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const data = { name, icon, color };
      const result = c
        ? await updateCategory(c.id, data)
        : await createCategory({ ...data, kind: editing.kind });
      if (!result.ok) {
        setError(result.fieldErrors?.name ?? result.error);
        return;
      }
      toast.success(c ? "Категория обновлена" : "Категория добавлена");
      onDone();
    });
  }

  function toggleArchived(value: boolean) {
    if (!c) return;
    setArchived(value);
    startTransition(async () => {
      const result = await setCategoryArchived(c.id, value);
      if (!result.ok) {
        setArchived(!value);
        toast.error(result.error);
      } else toast.success(value ? "Категория скрыта" : "Категория снова видна");
    });
  }

  function remove() {
    if (!c) return;
    startTransition(async () => {
      const result = await deleteCategory(c.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Категория удалена");
      onDone();
    });
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex items-end gap-3">
        <CategoryBadge icon={icon} color={color} size="lg" />
        <div className="grid flex-1 gap-2">
          <Label htmlFor="category-name">Название</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={40}
            aria-invalid={!!error}
            className="h-10"
          />
        </div>
      </div>
      {error && <p className="-mt-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-2">
        <Label>Цвет</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Цвет ${value}`}
              aria-pressed={color === value}
              onClick={() => setColor(value)}
              className={cn(
                "size-8 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                color === value && "ring-2 ring-foreground",
              )}
              style={{ backgroundColor: value }}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Иконка</Label>
        <div className="grid max-h-52 grid-cols-7 gap-1 overflow-y-auto rounded-xl border p-2 sm:grid-cols-8">
          {CATEGORY_ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              aria-pressed={icon === name}
              onClick={() => setIcon(name)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted",
                icon === name && "bg-accent text-accent-foreground",
              )}
            >
              <CategoryIcon name={name} className="size-[18px]" />
            </button>
          ))}
        </div>
      </div>

      {c && (
        <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Скрыть категорию</p>
            <p className="text-xs text-muted-foreground">
              Не будет предлагаться при добавлении, история сохранится
            </p>
          </div>
          <Switch checked={archived} onCheckedChange={toggleArchived} disabled={pending} />
        </div>
      )}

      <div className="flex gap-2">
        {c && (
          <Button
            type="button"
            variant="destructive"
            className="h-10"
            onClick={remove}
            disabled={pending}
            aria-label="Удалить категорию"
          >
            <Trash2 />
          </Button>
        )}
        <Button type="submit" className="h-10 flex-1" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Сохранить
        </Button>
      </div>
    </form>
  );
}

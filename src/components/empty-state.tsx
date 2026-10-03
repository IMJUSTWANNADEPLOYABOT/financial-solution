"use client";

import { Plus, Receipt } from "lucide-react";

import { useTransactionSheet } from "@/components/transaction-sheet";
import { Button } from "@/components/ui/button";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const { open } = useTransactionSheet();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Receipt className="size-6" aria-hidden />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      <Button onClick={() => open()} className="mt-1">
        <Plus />
        Добавить операцию
      </Button>
    </div>
  );
}

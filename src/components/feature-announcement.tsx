"use client";

import { useState, useTransition } from "react";
import { Crown, Loader2 } from "lucide-react";

import { acknowledgeAnnouncement } from "@/actions/announcement";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ANNOUNCEMENT } from "@/lib/announcement";

export function FeatureAnnouncement() {
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function acknowledge() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await acknowledgeAnnouncement();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setOpen(false);
      } catch {
        setError("Не удалось сохранить. Проверь соединение и нажми ещё раз.");
      }
    });
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-5 p-6 sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="shrink-0 items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary-strong">
            <Crown className="size-6" aria-hidden />
          </span>
          <DialogTitle className="text-xl leading-snug font-semibold">
            {ANNOUNCEMENT.title}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="min-h-0 overflow-y-auto overscroll-contain pr-2 text-base leading-relaxed break-words whitespace-pre-line text-foreground">
          {ANNOUNCEMENT.message}
        </DialogDescription>
        {error && (
          <p role="alert" className="shrink-0 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="button"
          className="h-11 w-full shrink-0"
          disabled={pending}
          onClick={acknowledge}
        >
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          VIEBU
        </Button>
      </DialogContent>
    </Dialog>
  );
}

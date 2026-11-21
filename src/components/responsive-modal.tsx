"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Отдельная прокрутка списка позволяет закрепить действия под ним. */
  scrollableBody?: boolean;
};

/** Шторка снизу на телефоне, диалог по центру на ПК. */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  scrollableBody = false,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "sm:max-w-md",
            scrollableBody && "flex max-h-[85dvh] flex-col overflow-hidden",
            className,
          )}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className={cn(!description && "sr-only")}>
              {description ?? title}
            </DialogDescription>
          </DialogHeader>
          {scrollableBody ? <div className="flex min-h-0 flex-col">{children}</div> : children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent
        className={cn("max-h-[94dvh]", scrollableBody && "overflow-hidden", className)}
      >
        <DrawerHeader className="shrink-0 pb-2 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className={cn(!description && "sr-only")}>
            {description ?? title}
          </DrawerDescription>
        </DrawerHeader>
        <div
          className={cn(
            "px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
            scrollableBody ? "flex min-h-0 flex-col" : "overflow-y-auto",
          )}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

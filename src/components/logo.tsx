import { cn } from "@/lib/utils";

/** Буква «О» (она же монетка) и блёстка. Те же фигуры — в scripts/generate-icons.mjs. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <circle
        cx="14.5"
        cy="17.5"
        r="7"
        className="stroke-primary-foreground"
        strokeWidth="2.8"
        fill="none"
      />
      <path
        d="M23.5 4.5Q23.5 9 28 9Q23.5 9 23.5 13.5Q23.5 9 19 9Q23.5 9 23.5 4.5Z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

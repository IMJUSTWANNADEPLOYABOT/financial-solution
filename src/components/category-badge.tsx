import { CategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

type Props = {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "size-7 rounded-lg [&_svg]:size-3.5",
  md: "size-9 rounded-xl [&_svg]:size-[18px]",
  lg: "size-11 rounded-2xl [&_svg]:size-5",
};

/** Иконка категории на мягкой подложке её цвета. */
export function CategoryBadge({ icon, color, size = "md", className }: Props) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", sizes[size], className)}
      style={{ color, backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)` }}
    >
      <CategoryIcon name={icon} aria-hidden />
    </span>
  );
}

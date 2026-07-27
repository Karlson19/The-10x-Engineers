import { type VariantProps, cva } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Status is never colour alone: every badge carries an icon and a word. */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs tracking-[0.08em] uppercase",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        current: "bg-accent-subtle text-accent-hover dark:text-accent",
        done: "bg-primary/10 text-primary dark:bg-primary/25 dark:text-primary-foreground",
        stopped: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  tone,
  icon: Icon,
  children,
  className,
}: VariantProps<typeof badgeVariants> & {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
      {children}
    </span>
  );
}

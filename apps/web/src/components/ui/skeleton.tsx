import { cn } from "@/lib/utils";

/**
 * A shimmer sweep rather than a flashing pulse. Skeletons must match the
 * dimensions of the real content so nothing jumps when data lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent",
        "motion-reduce:before:hidden",
        className,
      )}
    />
  );
}

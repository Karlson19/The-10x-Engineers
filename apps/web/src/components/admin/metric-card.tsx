"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Counts up from zero on first mount only. A number that re-animates on every
 * refetch is infuriating, so the run is keyed to mount rather than to data.
 */
function CountUp({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20 });
  const text = useTransform(spring, (current) => format(current));
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion || hasRun) {
      motionValue.jump(value);
      spring.jump(value);
      return;
    }
    motionValue.set(value);
    setHasRun(true);
  }, [value, motionValue, spring, prefersReducedMotion, hasRun]);

  if (prefersReducedMotion) {
    return <>{format(value)}</>;
  }

  return <motion.span>{text}</motion.span>;
}

export function MetricCard({
  label,
  value,
  format,
  hint,
  icon: Icon,
  index,
  tone = "default",
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  hint?: string;
  icon: LucideIcon;
  index: number;
  tone?: "default" | "accent" | "warning";
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.base,
        ease: motionTokens.easeOut,
        // 40ms between cards, so the row arrives as a sequence not a flash.
        delay: prefersReducedMotion ? 0 : index * 0.04,
      }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </p>
        <Icon
          aria-hidden
          size={18}
          className={cn(
            tone === "accent" && "text-accent",
            tone === "warning" && "text-warning",
            tone === "default" && "text-muted-foreground",
          )}
        />
      </div>

      <p className="mt-3 font-display text-3xl font-semibold text-card-foreground tabular-nums">
        <CountUp value={value} format={format} />
      </p>

      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </motion.div>
  );
}

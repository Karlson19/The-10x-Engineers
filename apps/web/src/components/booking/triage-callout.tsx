"use client";

import { motion, useReducedMotion } from "motion/react";
import { CircleCheck, OctagonAlert, Phone, TriangleAlert } from "lucide-react";
import { BUSINESS, type TriageResult, type UrgencyLevel } from "@chrysmec/shared";
import { buttonVariants } from "@/components/ui/button";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LEVEL = {
  routine: {
    icon: CircleCheck,
    label: "Safe to drive",
    container: "border-success/40 bg-success/5",
    mark: "text-success",
  },
  soon: {
    icon: TriangleAlert,
    label: "Needs attention",
    container: "border-warning/50 bg-warning/5",
    mark: "text-warning",
  },
  urgent: {
    icon: OctagonAlert,
    label: "Do not drive it",
    container: "border-destructive/50 bg-destructive/5",
    mark: "text-destructive",
  },
} as const satisfies Record<UrgencyLevel, unknown>;

/**
 * What the answers add up to, said back to the customer while they are still
 * filling the form in.
 *
 * The point is that a workshop which knows a brake pedal is sinking should say
 * "stop driving it" there and then, not take the booking quietly and see the
 * car in four days. Colour never carries this on its own: every level has an
 * icon and a sentence.
 */
export function TriageCallout({ triage }: { triage: TriageResult }) {
  const prefersReducedMotion = useReducedMotion();
  const { icon: Icon, label, container, mark } = LEVEL[triage.level];

  return (
    <motion.div
      // Keyed on the level, so changing an answer re-announces rather than
      // silently swapping the words underneath the customer.
      key={triage.level}
      role="status"
      aria-live="polite"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
      className={cn("rounded-lg border p-5", container)}
    >
      <div className="flex gap-3.5">
        <Icon aria-hidden className={cn("mt-0.5 size-6 shrink-0", mark)} strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1.5 font-display text-lg font-semibold text-foreground">
            {triage.headline}
          </p>
          <p className="mt-2 text-base text-muted-foreground">{triage.advice}</p>

          {triage.reasons.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {triage.reasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-sm text-muted-foreground">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-current" />
                  {reason}
                </li>
              ))}
            </ul>
          ) : null}

          {triage.callTheWorkshop ? (
            <a
              href={`tel:${BUSINESS.phoneHref}`}
              className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-4")}
            >
              <Phone aria-hidden size={16} />
              Ring us on {BUSINESS.phone}
            </a>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

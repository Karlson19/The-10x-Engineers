"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  type RequestStatus,
  type StatusEvent,
  TIMELINE_STAGES,
} from "@chrysmec/shared";
import { STATUS_META } from "@/lib/status";
import { formatDateTime } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

type StepState = "done" | "current" | "future";

type Step = {
  status: RequestStatus;
  state: StepState;
  at: string | null;
  note: string | null;
};

/**
 * Builds the stepper from the recorded events plus the current status, rather
 * than from the status alone, so the timestamps are the real ones and a stage
 * that was skipped still reads correctly.
 */
function buildSteps(status: RequestStatus, events: readonly StatusEvent[]): Step[] {
  const firstEventFor = new Map<RequestStatus, StatusEvent>();
  for (const event of events) {
    if (!firstEventFor.has(event.toStatus)) {
      firstEventFor.set(event.toStatus, event);
    }
  }

  const isCancelled = status === "CANCELLED";
  const currentIndex = TIMELINE_STAGES.indexOf(status);

  const steps: Step[] = TIMELINE_STAGES.map((stage, index) => {
    const event = firstEventFor.get(stage);

    let state: StepState = "future";
    if (!isCancelled && currentIndex >= 0 && index < currentIndex) {
      state = "done";
    } else if (!isCancelled && index === currentIndex) {
      state = "current";
    } else if (isCancelled && event) {
      state = "done";
    }

    return {
      status: stage,
      state,
      at: event?.createdAt ?? null,
      note: event?.note ?? null,
    };
  });

  if (isCancelled) {
    const cancelled = firstEventFor.get("CANCELLED");
    steps.push({
      status: "CANCELLED",
      state: "current",
      at: cancelled?.createdAt ?? null,
      note: cancelled?.note ?? null,
    });
  }

  return steps;
}

function Checkmark({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
      <motion.path
        d="M5 12.5 L10 17.5 L19 7"
        stroke="currentColor"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
      />
    </svg>
  );
}

/**
 * The signature screen. A customer should be able to look at this once and know
 * exactly where their vehicle is, without reading a word of explanation.
 */
export function StatusTimeline({
  status,
  events,
  className,
}: {
  status: RequestStatus;
  events: readonly StatusEvent[];
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const steps = buildSteps(status, events);

  return (
    <ol className={cn("relative", className)}>
      {steps.map((step, index) => {
        const meta = STATUS_META[step.status];
        const Icon = meta.icon;
        const isLast = index === steps.length - 1;
        const isCancelledStep = step.status === "CANCELLED";

        return (
          <li key={step.status} className="relative flex gap-4 pb-8 last:pb-0">
            {/* The connector fills downward once the stage below has been reached. */}
            {!isLast ? (
              <span
                aria-hidden
                className="absolute top-9 bottom-1 left-[1.0625rem] w-0.5 overflow-hidden rounded-full bg-border"
              >
                <motion.span
                  className={cn(
                    "block h-full w-full origin-top rounded-full",
                    isCancelledStep ? "bg-destructive" : "bg-primary",
                  )}
                  initial={prefersReducedMotion ? false : { scaleY: 0 }}
                  animate={{ scaleY: steps[index + 1]?.state === "future" ? 0 : 1 }}
                  transition={{
                    duration: motionTokens.slow,
                    ease: motionTokens.easeOut,
                    delay: prefersReducedMotion ? 0 : index * 0.06,
                  }}
                />
              </span>
            ) : null}

            <span className="relative flex size-9 shrink-0 items-center justify-center">
              {/* Soft pulsing ring on the stage the job is actually at. */}
              {step.state === "current" && !prefersReducedMotion ? (
                <motion.span
                  aria-hidden
                  className={cn(
                    "absolute inset-0 rounded-full",
                    isCancelledStep ? "bg-destructive/40" : "bg-accent/40",
                  )}
                  initial={{ opacity: 0.4, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              ) : null}

              <span
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-full border-2 transition-colors",
                  step.state === "done" && "border-primary bg-primary text-primary-foreground",
                  step.state === "current" &&
                    !isCancelledStep &&
                    "border-accent bg-accent text-accent-foreground",
                  step.state === "current" &&
                    isCancelledStep &&
                    "border-destructive bg-destructive text-destructive-foreground",
                  step.state === "future" && "border-border bg-background text-muted-foreground",
                )}
              >
                {step.state === "done" ? (
                  <Checkmark animate={!prefersReducedMotion} />
                ) : (
                  <Icon aria-hidden className="size-4" />
                )}
              </span>
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3
                  className={cn(
                    "font-display text-lg font-semibold",
                    step.state === "future" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {meta.customerLabel}
                </h3>
                {step.at ? (
                  <time dateTime={step.at} className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(step.at)}
                  </time>
                ) : null}
                {step.state === "current" ? (
                  <span className="font-mono text-xs tracking-[0.12em] text-accent-text uppercase">
                    Now
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-1 text-base",
                  step.state === "future" ? "text-muted-foreground/70" : "text-muted-foreground",
                )}
              >
                {step.note ?? meta.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

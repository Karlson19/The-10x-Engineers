"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Wrench } from "lucide-react";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The product, running, in the shopfront.
 *
 * The one thing a customer is meant to remember about this app is the status
 * timeline: knowing where the vehicle is without ringing to ask. A page that
 * only writes that down in a paragraph is asking to be believed. This shows it
 * instead, moving through the stages the way a real booking does, so the value
 * is obvious before anybody signs up.
 *
 * It is a demonstration rather than live data: no session, no request, nothing
 * to wait for on a slow connection.
 */

const STAGES = [
  { label: "Submitted", detail: "Booking received" },
  { label: "Scheduled", detail: "Kwame Mensah assigned" },
  { label: "In progress", detail: "Diagnosis started" },
  { label: "Awaiting your approval", detail: "Estimate GHS 480.00" },
  { label: "Completed", detail: "Ready for collection" },
] as const;

/** Long enough to read a stage, short enough that the loop is never a wait. */
const STAGE_MS = 2200;

export function HeroShowcase() {
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    // Reduced motion gets the finished article rather than a loop it did not
    // ask for: every stage done, nothing moving.
    if (prefersReducedMotion) {
      setActive(STAGES.length - 1);
      return;
    }

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % STAGES.length);
    }, STAGE_MS);

    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: motionTokens.slow, ease: motionTokens.easeOut, delay: 0.15 }}
      className="relative mx-auto w-full max-w-sm lg:max-w-md"
    >
      {/* A soft bloom behind the card, so it lifts off the panel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-accent/20 blur-3xl"
      />

      <div className="relative rounded-xl border border-brand-surface-foreground/15 bg-brand-surface-foreground/[0.07] p-5 backdrop-blur-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-[0.14em] text-brand-surface-foreground/60 uppercase">
              CH-7F3A21
            </p>
            <p className="mt-1 truncate font-display text-lg font-semibold">Toyota Corolla</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-surface-foreground/10">
            <Wrench aria-hidden size={18} />
          </span>
        </div>

        <ol className="mt-6 space-y-0">
          {STAGES.map((stage, index) => {
            const isDone = index < active;
            const isCurrent = index === active;
            const isLast = index === STAGES.length - 1;

            return (
              <li key={stage.label} className="relative flex gap-3.5 pb-5 last:pb-0">
                {/* The rail between nodes, filling as stages complete. */}
                {isLast ? null : (
                  <span
                    aria-hidden
                    className="absolute top-6 left-[11px] h-full w-px bg-brand-surface-foreground/15"
                  >
                    <motion.span
                      className="block w-px origin-top bg-accent"
                      initial={false}
                      animate={{ scaleY: isDone ? 1 : 0 }}
                      transition={{ duration: motionTokens.base, ease: motionTokens.ease }}
                      style={{ height: "100%" }}
                    />
                  </span>
                )}

                <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center">
                  {/* The pulse on the stage a vehicle is actually at. */}
                  {isCurrent && !prefersReducedMotion ? (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-accent"
                      initial={{ opacity: 0.4, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.9 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    />
                  ) : null}

                  <span
                    className={cn(
                      "relative flex size-6 items-center justify-center rounded-full border-2 transition-colors duration-200",
                      isDone && "border-accent bg-accent text-accent-foreground",
                      isCurrent && "border-accent bg-accent text-accent-foreground",
                      !isDone &&
                        !isCurrent &&
                        "border-brand-surface-foreground/25 bg-transparent",
                    )}
                  >
                    <AnimatePresence initial={false}>
                      {isDone ? (
                        <motion.span
                          key="tick"
                          initial={prefersReducedMotion ? false : { scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
                        >
                          <Check aria-hidden size={13} strokeWidth={3.5} />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </span>
                </span>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className={cn(
                      "text-sm transition-colors duration-200",
                      isCurrent || isDone
                        ? "text-brand-surface-foreground"
                        : "text-brand-surface-foreground/45",
                    )}
                  >
                    {stage.label}
                  </p>

                  {/* Only the current stage carries its detail, so the card
                      never becomes a wall of text. */}
                  <AnimatePresence mode="wait" initial={false}>
                    {isCurrent ? (
                      <motion.p
                        key={stage.detail}
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: motionTokens.fast }}
                        className="mt-0.5 font-mono text-xs text-brand-surface-foreground/70"
                      >
                        {stage.detail}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mt-4 text-center text-sm text-brand-surface-foreground/60">
        Every stage timestamped. No more calling to ask.
      </p>
    </motion.div>
  );
}

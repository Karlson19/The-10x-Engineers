"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { PASSWORD_RULES, passwordStrength } from "@chrysmec/shared";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Bar and word share a colour, so the reading is the same either way you look. */
const TONE = [
  { bar: "bg-border", text: "text-muted-foreground" },
  { bar: "bg-destructive", text: "text-destructive" },
  { bar: "bg-warning", text: "text-warning" },
  { bar: "bg-success", text: "text-success" },
  { bar: "bg-success", text: "text-success" },
] as const;

/**
 * What the password still needs, live, rather than waiting for a failed submit
 * to say "include at least one number". The rules come from the shared package,
 * the same list the server validates against.
 *
 * The checklist is vertical and the strength word sits on its own line. Both
 * used to be squeezed onto one row, where "Too weak" wrapped down the middle
 * and three rules jammed together read like a validation dump rather than
 * something helping you.
 */
export function PasswordStrength({ value, id }: { value: string; id: string }) {
  const strength = passwordStrength(value);
  const prefersReducedMotion = useReducedMotion();
  const isEmpty = value.length === 0;
  const tone = TONE[strength.score];

  return (
    <div id={id} className="mt-3">
      <div
        className="flex h-1.5 gap-1.5"
        role="meter"
        aria-valuenow={strength.score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label="Password strength"
      >
        {[1, 2, 3, 4].map((segment) => (
          <span key={segment} className="h-full flex-1 overflow-hidden rounded-full bg-border">
            <motion.span
              className={cn("block h-full w-full origin-left rounded-full", tone.bar)}
              initial={false}
              animate={{ scaleX: segment <= strength.score ? 1 : 0 }}
              transition={{
                duration: prefersReducedMotion ? 0 : motionTokens.base,
                ease: motionTokens.easeOut,
              }}
            />
          </span>
        ))}
      </div>

      {/* Its own line, so a two word verdict never wraps down the middle. */}
      <div className="mt-2 min-h-5">
        <AnimatePresence mode="wait">
          {isEmpty ? null : (
            <motion.p
              key={strength.label}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
              transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
              className={cn(
                "font-mono text-xs tracking-[0.14em] uppercase",
                tone.text,
              )}
            >
              {strength.label}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <ul className="mt-2 space-y-1.5">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(value);

          return (
            <li key={rule.id} className="flex items-center gap-2.5 text-sm">
              {/*
                One shape that fills in, rather than a tick swapping places with
                a cross. A row of red crosses on a password you have not finished
                typing is telling somebody off for nothing.
              */}
              <motion.span
                aria-hidden
                animate={
                  prefersReducedMotion || !met ? undefined : { scale: [1, 1.18, 1] }
                }
                transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 motion-reduce:transition-none",
                  met
                    ? "border-success bg-success text-success-foreground"
                    : "border-input bg-transparent",
                )}
              >
                {met ? <Check size={11} strokeWidth={3.5} /> : null}
              </motion.span>

              <span className={met ? "text-muted-foreground" : "text-foreground"}>
                {rule.label}
              </span>
              <span className="sr-only">{met ? ", done" : ", still needed"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Car, Check, ClipboardList } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * What a customer sees before they have anything.
 *
 * The home screen used to answer an empty account with three stacked empty
 * boxes and three competing buttons, two of which said "Book a service" in
 * different colours. It also offered booking first, which cannot work: the
 * wizard opens on "which vehicle?" and there are none.
 *
 * So this is one path, in the order the app actually requires. The numbering is
 * real here, unlike most places it gets used: step two is genuinely unavailable
 * until step one is done, and it says so rather than failing later.
 */
export function FirstRun({ hasVehicle }: { hasVehicle: boolean }) {
  const prefersReducedMotion = useReducedMotion();

  const steps = [
    {
      title: "Add your vehicle",
      body: "Make, model and registration. You only do this once.",
      href: "/dashboard/vehicles",
      cta: "Add a vehicle",
      icon: Car,
      done: hasVehicle,
    },
    {
      title: "Tell us what it is doing",
      body: "Guided questions about the fault, so a technician knows what to expect before you arrive.",
      href: "/dashboard/book",
      cta: "Book a service",
      icon: ClipboardList,
      done: false,
    },
  ];

  // Exactly one step is live at a time, which is what keeps a single action on
  // the screen instead of the three the old layout offered.
  const activeIndex = steps.findIndex((step) => !step.done);

  return (
    <section className="mt-7">
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const Icon = step.icon;

          return (
            <motion.li
              key={step.title}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.base,
                ease: motionTokens.easeOut,
                delay: prefersReducedMotion ? 0 : index * 0.07,
              }}
              className={cn(
                "rounded-xl border p-5 sm:p-6",
                isActive ? "border-accent/45 bg-card" : "border-border bg-card/60",
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm",
                    step.done && "bg-success text-success-foreground",
                    isActive && "bg-accent text-accent-foreground",
                    !step.done && !isActive && "border border-border text-muted-foreground",
                  )}
                >
                  {step.done ? <Check size={18} strokeWidth={3} /> : index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <h3
                    className={cn(
                      "font-display text-xl font-semibold",
                      step.done ? "text-muted-foreground" : "text-card-foreground",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-base text-muted-foreground">{step.body}</p>

                  {step.done ? (
                    <p className="mt-3 font-mono text-xs tracking-[0.12em] text-success uppercase">
                      Done
                    </p>
                  ) : isActive ? (
                    <Link
                      href={step.href}
                      className={cn(buttonVariants({ variant: "accent" }), "mt-4")}
                    >
                      <Icon aria-hidden size={18} />
                      {step.cta}
                      <ArrowRight aria-hidden size={18} />
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Available once your vehicle is on the list.
                    </p>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}

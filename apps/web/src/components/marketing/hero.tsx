"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Phone, Star } from "lucide-react";
import { BUSINESS } from "@chrysmec/shared";
import { HeroShowcase } from "@/components/marketing/hero-showcase";
import { buttonVariants } from "@/components/ui/button";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

const phoneHref = `tel:${BUSINESS.phoneHref}`;

/**
 * The shopfront's opening.
 *
 * Depth comes from two soft washes of colour behind the panel rather than from
 * a picture, because a stock photograph of somebody else's workshop would be a
 * lie and the real one has not been photographed yet. The card beside the copy
 * is the product itself running, which does more than any amount of prose
 * about knowing where your vehicle is.
 *
 * Everything moves on transform and opacity only, and every delay is short
 * enough that the content is readable before it has finished arriving.
 */
export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  /** Content arrives in order, 60ms apart, so the eye is led down it. */
  const rise = (index: number) => ({
    initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: motionTokens.base,
      ease: motionTokens.easeOut,
      delay: prefersReducedMotion ? 0 : index * 0.06,
    },
  });

  return (
    <section className="paper-grain relative overflow-hidden bg-brand-surface text-brand-surface-foreground">
      {/*
        Two blurred washes give the flat brand colour some depth. Both are
        decorative, sit behind everything, and cost nothing to paint on a phone
        because neither of them animates.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full bg-primary/25 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-48 size-[30rem] rounded-full bg-accent/15 blur-[120px]"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-28">
        <div className="lg:col-span-7">
          <motion.p
            {...rise(0)}
            className="font-mono text-xs tracking-[0.16em] text-brand-surface-foreground/65 uppercase"
          >
            {BUSINESS.tagline}
          </motion.p>

          <motion.h1
            {...rise(1)}
            className="mt-5 max-w-[16ch] font-display text-4xl font-semibold tracking-[-0.02em] text-balance sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]"
          >
            Your vehicle, handled by specialists.
          </motion.h1>

          <motion.p
            {...rise(2)}
            className="mt-6 max-w-xl text-lg text-brand-surface-foreground/80"
          >
            Tell us what the car is doing and we will tell you what it needs, what it costs, and
            when it will be ready. No guesswork, no chasing us for an update.
          </motion.p>

          {/* The three things the business actually sells, straight off the flier. */}
          <motion.ul {...rise(3)} className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {BUSINESS.services.map((service) => (
              <li
                key={service}
                className="flex items-center gap-2 text-base text-brand-surface-foreground/90"
              >
                <Check aria-hidden size={18} className="shrink-0 text-accent-on-dark" />
                {service}
              </li>
            ))}
          </motion.ul>

          <motion.div {...rise(4)} className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/dashboard/book" className={buttonVariants({ variant: "accent" })}>
              Book a service
              <ArrowRight aria-hidden size={18} />
            </Link>
            <a
              href={phoneHref}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-brand-surface-foreground/30 text-brand-surface-foreground hover:border-brand-surface-foreground/60 hover:bg-brand-surface-foreground/10",
              )}
            >
              <Phone aria-hidden size={18} />
              {BUSINESS.phone}
            </a>
          </motion.div>

          {/* Where the business actually is, said once and quietly. */}
          <motion.p
            {...rise(5)}
            className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-surface-foreground/60"
          >
            <Star aria-hidden size={14} className="text-accent-on-dark" />
            Mechanical and electrical, {BUSINESS.locations.slice(0, -1).join(", ")} and{" "}
            {BUSINESS.locations.at(-1)}.
          </motion.p>
        </div>

        <div className="lg:col-span-5">
          <HeroShowcase />
        </div>
      </div>
    </section>
  );
}

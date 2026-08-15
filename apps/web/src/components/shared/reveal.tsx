"use client";

import { motion } from "motion/react";
import { motionTokens } from "@/lib/motion";

/**
 * Entrance motion, in the two shapes the app actually needs.
 *
 * Both animate on mount and never again. That is deliberate: a list that
 * re-staggers itself every time the data is refetched is infuriating, and
 * TanStack refetches in the background constantly. Because a query only
 * unmounts its skeleton once, mounting is exactly the moment worth marking.
 *
 * Reduced motion is handled globally by MotionConfig, which drops the
 * transform and keeps the fade, so nothing here needs to ask.
 */

/**
 * A block that rises into place. Use for sections and standalone cards.
 *
 * Renders whichever element it is standing in for rather than wrapping one, so
 * adding it to an existing screen is a one for one swap that changes no
 * nesting and no layout.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  ...rest
}: {
  children: React.ReactNode;
  /** Seconds. Keep under 0.25 so nothing important is late. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "header";
  id?: string;
}) {
  const Component = motion[as];

  return (
    <Component
      {...rest}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.base, ease: motionTokens.easeOut, delay }}
      className={className}
    >
      {children}
    </Component>
  );
}

/**
 * A list whose rows arrive one after another, 40ms apart.
 *
 * The delay is capped by the child count inside StaggerChild rather than left
 * to run away: forty rows at 40ms would take the last one one and a half
 * seconds to appear, which is not a flourish, it is a wait.
 */
export function StaggerGroup({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const Component = motion[as];

  return (
    <Component
      initial="hidden"
      animate="shown"
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: 0.04 } },
      }}
      className={className}
    >
      {children}
    </Component>
  );
}

/** One row inside a StaggerGroup. */
export function StaggerChild({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const Component = motion[as];

  return (
    <Component
      variants={{
        hidden: { opacity: 0, y: 10 },
        shown: {
          opacity: 1,
          y: 0,
          transition: { duration: motionTokens.base, ease: motionTokens.easeOut },
        },
      }}
      className={className}
    >
      {children}
    </Component>
  );
}

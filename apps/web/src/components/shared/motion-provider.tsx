"use client";

import { MotionConfig } from "motion/react";
import { motionTokens } from "@/lib/motion";

/**
 * One place that honours prefers-reduced-motion for the whole app. With
 * reducedMotion set to "user", framer-motion drops transform and layout
 * animations and keeps opacity changes only, which is what the spec asks for.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: motionTokens.base, ease: motionTokens.ease }}
    >
      {children}
    </MotionConfig>
  );
}

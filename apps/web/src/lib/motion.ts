import type { Transition } from "motion/react";

type CubicBezier = [number, number, number, number];

type MotionTokens = {
  instant: number;
  fast: number;
  base: number;
  slow: number;
  ease: CubicBezier;
  easeOut: CubicBezier;
  easeIn: CubicBezier;
  spring: Transition;
};

/**
 * The only place timings and easings are defined. Nothing in the product
 * exceeds 400ms, because anything longer reads as broken on a phone.
 */
export const motionTokens: MotionTokens = {
  instant: 0.1,
  fast: 0.18, // hover, toggles, button feedback
  base: 0.24, // most transitions
  slow: 0.36, // page level, modals
  ease: [0.25, 0.1, 0.25, 1], // standard
  easeOut: [0.16, 1, 0.3, 1], // entrances, feels responsive
  easeIn: [0.4, 0, 1, 1], // exits
  spring: { type: "spring", stiffness: 380, damping: 30 },
};

/** Entrance used by cards and list rows: 12px rise with a fade. */
export const riseIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: motionTokens.base, ease: motionTokens.easeOut },
} as const;

/** Press feedback shared by every button-like control. */
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.97 },
  transition: { duration: motionTokens.instant, ease: motionTokens.ease },
} as const;

/** Dashboard and list staggering: 40ms between children. */
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
} as const;

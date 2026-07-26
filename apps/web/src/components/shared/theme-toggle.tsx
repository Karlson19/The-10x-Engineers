"use client";

import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/shared/theme-provider";
import { motionTokens, pressable } from "@/lib/motion";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted"
      whileHover={pressable.whileHover}
      whileTap={pressable.whileTap}
      transition={pressable.transition}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ opacity: 0, rotate: -35 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 35 }}
          transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
          className="flex"
        >
          {isDark ? <Moon aria-hidden size={18} /> : <Sun aria-hidden size={18} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

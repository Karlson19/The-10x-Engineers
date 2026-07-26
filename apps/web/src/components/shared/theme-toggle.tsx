"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/shared/theme-provider";

/**
 * The icon swap is done with CSS against the dark class on the root element,
 * not with an animation library, so the public pages do not have to download
 * one just to draw a toggle.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className="relative inline-flex size-11 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-[transform,background-color,border-color] duration-100 ease-out hover:-translate-y-px hover:border-muted-foreground/50 hover:bg-muted active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <Sun
        aria-hidden
        size={18}
        className="absolute transition-[opacity,transform] duration-150 dark:rotate-[35deg] dark:opacity-0 motion-reduce:transition-none"
      />
      <Moon
        aria-hidden
        size={18}
        className="absolute -rotate-[35deg] opacity-0 transition-[opacity,transform] duration-150 dark:rotate-0 dark:opacity-100 motion-reduce:transition-none"
      />
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { SECTION_LABELS } from "@chrysmec/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { homeForRole } from "@/lib/auth/routes";

const ROLE_LABELS = {
  CLIENT: "Customer",
  STAFF: "Technician",
  MANAGEMENT: "Management",
} as const;

/**
 * The account menu. Sign out lives here rather than only on the account page,
 * because someone who wants to sign out should never have to navigate to find
 * the button, and on a shared phone that matters.
 */
export function AccountNav() {
  const { user, status, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (status === "loading") {
    return (
      <div
        aria-hidden
        className="h-11 w-28 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-28 px-3")}
      >
        Sign in
      </Link>
    );
  }

  const firstName = user.fullName.split(" ")[0] ?? "Account";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "max-w-40 gap-2 px-3")}
      >
        <UserRound aria-hidden size={18} />
        <span className="truncate">{firstName}</span>
        <ChevronDown
          aria-hidden
          size={16}
          className={cn(
            "shrink-0 transition-transform duration-150 motion-reduce:transition-none",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            role="menu"
            aria-label="Account"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
            className="absolute right-0 z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-lg border border-border bg-popover"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate font-medium text-popover-foreground">{user.fullName}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-1 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
                {ROLE_LABELS[user.role]}
                {user.section ? ` | ${SECTION_LABELS[user.section]}` : ""}
              </p>
            </div>

            <Link
              href={homeForRole(user.role)}
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex min-h-12 items-center gap-3 px-4 text-base text-popover-foreground transition-colors hover:bg-muted"
            >
              <UserRound aria-hidden size={18} className="text-muted-foreground" />
              My home page
            </Link>

            <Link
              href="/dashboard/account"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex min-h-12 items-center gap-3 px-4 text-base text-popover-foreground transition-colors hover:bg-muted"
            >
              <UserRound aria-hidden size={18} className="text-muted-foreground" />
              Account details
            </Link>

            <button
              type="button"
              role="menuitem"
              disabled={isSigningOut}
              onClick={async () => {
                setIsSigningOut(true);
                try {
                  await signOut();
                } finally {
                  setIsOpen(false);
                  setIsSigningOut(false);
                }
              }}
              className="flex min-h-12 w-full items-center gap-3 border-t border-border px-4 text-left text-base text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            >
              <LogOut aria-hidden size={18} />
              {isSigningOut ? "Signing out" : "Sign out"}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

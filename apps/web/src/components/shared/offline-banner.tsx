"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CloudUpload, WifiOff } from "lucide-react";
import { useOffline } from "@/components/providers/offline-provider";
import { motionTokens } from "@/lib/motion";

/**
 * Slides down from the top edge and stays there while the connection is gone.
 * Deliberately a strip rather than a dialog: it must never block the UI,
 * because the whole point is that the app keeps working without a network.
 */
export function OfflineBanner() {
  const { isOnline, pending } = useOffline();
  const prefersReducedMotion = useReducedMotion();

  const showOffline = !isOnline;
  const showPending = isOnline && pending > 0;

  return (
    <AnimatePresence initial={false}>
      {showOffline || showPending ? (
        <motion.div
          key={showOffline ? "offline" : "syncing"}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -32 }}
          transition={{ duration: 0.2, ease: motionTokens.easeOut }}
          role="status"
          aria-live="polite"
          className={
            showOffline
              ? "sticky top-0 z-50 flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-sm text-background"
              : "sticky top-0 z-50 flex items-center justify-center gap-2 bg-accent-subtle px-4 py-2 text-sm text-accent-text dark:bg-accent/20"
          }
        >
          {showOffline ? (
            <>
              <WifiOff aria-hidden size={16} />
              <span>
                You are offline. You can still book, and we will send it when you are back.
              </span>
            </>
          ) : (
            <>
              <CloudUpload aria-hidden size={16} />
              <span>
                Sending {pending} {pending === 1 ? "booking" : "bookings"}.
              </span>
            </>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

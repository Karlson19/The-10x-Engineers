"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { isOutboxAvailable } from "@/lib/offline/db";
import { clearSynced, flushOutbox, pendingCount } from "@/lib/offline/outbox";

type OfflineContextValue = {
  isOnline: boolean;
  /** How many bookings are waiting to reach the server. */
  pending: number;
  /** Re-reads the queue. Call after adding something to it. */
  refreshPending: () => Promise<void>;
  flush: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

/** How long a synced badge stays visible before the entry is cleared. */
const SYNCED_BADGE_MS = 4000;

/**
 * Owns connectivity and the outbox flush.
 *
 * Three things trigger a flush, because no single one is reliable on a phone:
 * the `online` event, which some Android browsers fire late or not at all;
 * `visibilitychange`, for coming back to a tab that was backgrounded through a
 * tunnel; and Background Sync where the browser supports it, which can run even
 * if the tab is closed.
 */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async () => {
    if (!isOutboxAvailable()) {
      return;
    }
    setPending(await pendingCount());
  }, []);

  const flush = useCallback(async () => {
    if (!isOutboxAvailable()) {
      return;
    }

    const result = await flushOutbox();
    await refreshPending();

    if (result.synced > 0) {
      showToast({
        tone: "success",
        title:
          result.synced === 1 ? "Your booking has been sent" : `${result.synced} bookings sent`,
        body: "The workshop has it now.",
      });

      // The list can show the real record instead of the pending row.
      void queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // Leave the synced badge up briefly so the change is visible, then tidy.
      window.setTimeout(() => {
        void clearSynced().then(() => refreshPending());
      }, SYNCED_BADGE_MS);
    }

    if (result.failed > 0) {
      showToast({
        tone: "error",
        title: result.failed === 1 ? "One booking could not be sent" : "Some bookings failed",
        body: "Open your requests to see what happened.",
      });
    }
  }, [queryClient, refreshPending, showToast]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    void refreshPending();

    function handleOnline(): void {
      setIsOnline(true);
      void flush();
    }

    function handleOffline(): void {
      setIsOnline(false);
    }

    function handleVisibility(): void {
      if (document.visibilityState === "visible") {
        setIsOnline(navigator.onLine);
        if (navigator.onLine) {
          void flush();
        }
      }
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    // Anything left over from a previous visit goes now.
    if (navigator.onLine) {
      void flush();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [flush, refreshPending]);

  const value = useMemo(
    () => ({ isOnline, pending, refreshPending, flush }),
    [isOnline, pending, refreshPending, flush],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used inside an OfflineProvider.");
  }
  return context;
}

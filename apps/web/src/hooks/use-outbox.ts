"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type { OutboxEntry } from "@/lib/offline/db";
import { getDatabase, isOutboxAvailable } from "@/lib/offline/db";

/**
 * Live view of the queue. Dexie pushes updates as entries change status, so a
 * pending badge becomes a synced one without any polling.
 */
export function useOutbox(): OutboxEntry[] {
  const entries = useLiveQuery(async () => {
    if (!isOutboxAvailable()) {
      return [];
    }
    return getDatabase().outbox.orderBy("createdAt").reverse().toArray();
  }, []);

  return entries ?? [];
}

/** Just the bookings that have not reached the server yet. */
export function usePendingBookings(): OutboxEntry[] {
  return useOutbox().filter((entry) => entry.status !== "synced");
}

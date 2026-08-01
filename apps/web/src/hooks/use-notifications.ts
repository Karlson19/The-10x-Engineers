"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";

export const NOTIFICATIONS_KEY = ["notifications"] as const;

/** How often the bell re-checks while the app is open. */
const POLL_MS = 60_000;

export function useNotifications() {
  const { status } = useAuth();

  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => fetchNotifications(),
    // Signed out there is nothing to fetch, and asking would only 401.
    enabled: status === "authenticated",
    /*
      A minute is often enough that a technician learns an estimate was approved
      without going looking, and rare enough to be nothing on a metered
      connection: the response is a few hundred bytes.
    */
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

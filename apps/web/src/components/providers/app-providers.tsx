"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { OfflineProvider } from "@/components/providers/offline-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Server state, the session, the outbox and toasts. Deliberately not in the
 * root layout: the public landing page is the shopfront and should not carry a
 * query client, an auth bootstrap and an IndexedDB connection over 3G just to
 * render a phone number.
 *
 * Order matters. The offline provider raises toasts when the queue drains and
 * invalidates queries once bookings land, so it sits inside both.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>
          <OfflineProvider>{children}</OfflineProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}

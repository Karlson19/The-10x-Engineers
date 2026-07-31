"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { OfflineProvider } from "@/components/providers/offline-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Server state, the session, the outbox and toasts.
 *
 * This is mounted once, in the root layout. It used to sit in each route
 * group's layout instead, to keep the public landing page light, but moving
 * between groups then unmounted the query client and threw the whole cache
 * away. Signing in crosses exactly that boundary, so every sign in discarded
 * the session it had just established and restored an older one from the
 * refresh cookie, which is how people ended up in the wrong account.
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

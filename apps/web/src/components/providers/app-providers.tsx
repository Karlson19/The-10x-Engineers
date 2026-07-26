"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";

/**
 * Server state and the session. Deliberately not in the root layout: the public
 * landing page is the shopfront and should not carry a query client and an auth
 * bootstrap request over 3G just to render a phone number.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}

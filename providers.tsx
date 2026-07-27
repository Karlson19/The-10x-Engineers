"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNetwork } from "@/lib/network";
import { useOutboxFlusher } from "@/lib/use-outbox";
import { useAuth } from "@/lib/store";
import { DEMO_USERS } from "@/lib/mock-data";
import type { Role } from "@/lib/types";

function NetworkListener() {
  const setBrowserOnline = useNetwork((s) => s.setBrowserOnline);
  useEffect(() => {
    setBrowserOnline(navigator.onLine);
    const on = () => setBrowserOnline(true);
    const off = () => setBrowserOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [setBrowserOnline]);
  return null;
}

function AuthHydrator() {
  const setUser = useAuth((s) => s.login);
  useEffect(() => {
    const match = document.cookie.match(/chrysmec_role=([A-Z]+)/);
    const role = match?.[1] as Role | undefined;
    if (role && DEMO_USERS[role]) setUser(role);
  }, [setUser]);
  return null;
}

function OutboxFlusherMount() {
  useOutboxFlusher();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={client}>
      <NetworkListener />
      <AuthHydrator />
      <OutboxFlusherMount />
      {children}
    </QueryClientProvider>
  );
}

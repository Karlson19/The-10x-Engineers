"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /*
          Coming back to the app re-checks, but only if the data is older than
          the stale time below. This used to be off entirely to save mobile
          data, which meant somebody who switched apps and came back was looking
          at whatever was true when they left, with no way to know. Thirty
          seconds is the compromise: flicking between apps costs nothing,
          returning to a job later gets the current answer.
        */
        refetchOnWindowFocus: true,
        staleTime: 30_000,
        retry(failureCount, error) {
          if (error instanceof ApiError && !error.isRetryable) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client per browser session, created lazily so it is never shared
  // between server renders.
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

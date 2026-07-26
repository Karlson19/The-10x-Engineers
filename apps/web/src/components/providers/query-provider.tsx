"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Users are on metered mobile data. Do not refetch just because they
        // switched apps and came back.
        refetchOnWindowFocus: false,
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

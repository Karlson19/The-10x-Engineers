"use client";

import { useState } from "react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";

/**
 * Mutations that put their own error on the screen, next to the field or the
 * form it belongs to. Those are better than a toast, because they stay put and
 * they sit where the problem is, so the safety net below leaves them alone.
 */
type MutationMeta = { inlineError?: boolean };

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Something went wrong. Check your connection and try again.";
}

function createQueryClient(notify: (message: string) => void): QueryClient {
  return new QueryClient({
    /*
      The last line of defence for anything that changes data.

      Every mutation here is something a person deliberately pressed, so a
      failure they are never told about is the worst outcome available: they
      assume it worked. Most callers do catch and explain, but there were more
      than thirty of these and only a third of them said anything, so silence
      was the default rather than the exception. Now a failure nobody handles
      still surfaces.
    */
    mutationCache: new MutationCache({
      onError(error, _variables, _context, mutation) {
        const meta = mutation.options.meta as MutationMeta | undefined;

        if (meta?.inlineError) {
          return;
        }

        notify(messageFor(error));
      },
    }),

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
  const { showToast } = useToast();

  // One client per browser session, created lazily so it is never shared
  // between server renders.
  const [queryClient] = useState(() =>
    createQueryClient((message) =>
      showToast({ tone: "error", title: "That did not go through", body: message }),
    ),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

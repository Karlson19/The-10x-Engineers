"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { BUSINESS } from "@chrysmec/shared";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * The last line of defence. Anything that throws while rendering lands here
 * rather than on a blank page, and the customer is given the workshop's number,
 * because at that point a phone call is the working route.
 */
/**
 * A build that has moved on under a tab that has not.
 *
 * The app is a PWA, so a phone keeps a service worker and a precached copy of
 * the last build it saw. After a deploy, a page held from before can ask for a
 * script chunk that the new deployment no longer serves, and the import
 * rejects. It looks exactly like a crash in whatever screen was being opened,
 * which is misleading: the code is fine, the copy on the device is stale.
 */
function isStaleBuildError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /loading chunk|loading css chunk|dynamically imported module|importing a module script failed/i.test(
      error.message,
    )
  );
}

/** Guards against a reload loop when the fresh copy fails for a real reason. */
const RECOVERY_KEY = "chrysmec-stale-build-reload";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  /*
    Clear the stale copy and reload, once. Nothing here is a cache the app
    cannot rebuild from the network, and the booking draft lives in local
    storage, which is deliberately left alone.
  */
  useEffect(() => {
    if (!isStaleBuildError(error) || sessionStorage.getItem(RECOVERY_KEY)) {
      return;
    }

    sessionStorage.setItem(RECOVERY_KEY, "1");

    void (async () => {
      try {
        const registrations = await navigator.serviceWorker?.getRegistrations();
        await Promise.all((registrations ?? []).map((registration) => registration.unregister()));

        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // Even if clearing failed, the reload is still worth having.
      }

      window.location.reload();
    })();
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center">
      <div className="mx-auto w-full max-w-xl px-5 py-16 text-center sm:px-8">
        <TriangleAlert aria-hidden className="mx-auto size-10 text-destructive" />
        <p className="eyebrow mt-6">Something went wrong</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">
          This page could not be shown
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Nothing you have saved is lost. Try again, and if it keeps happening, ring the workshop
          and we will sort it out on the phone.
        </p>

        {/*
          What actually went wrong, on the screen rather than only in a console
          nobody standing in a workshop with a phone can open. It is the one
          thing that makes a report over the telephone worth taking, and it is
          kept quiet enough not to alarm somebody who only wanted to book a
          service.
        */}
        {error.digest || error.message ? (
          <p className="mt-5 font-mono text-xs break-words text-muted-foreground/80">
            {error.digest ? `Reference ${error.digest}` : error.message}
          </p>
        ) : null}

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <a href={`tel:${BUSINESS.phoneHref}`} className={buttonVariants({ variant: "outline" })}>
            Ring {BUSINESS.phone}
          </a>
        </div>
      </div>
    </div>
  );
}

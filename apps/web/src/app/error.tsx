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

        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            Reference {error.digest}
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

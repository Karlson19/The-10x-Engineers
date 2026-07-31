import Link from "next/link";
import type { Metadata } from "next";
import { FileQuestion } from "lucide-react";
import { BUSINESS } from "@chrysmec/shared";
import { SiteHeader } from "@/components/shared/site-header";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-xl px-5 py-16 text-center sm:px-8">
          <FileQuestion aria-hidden className="mx-auto size-10 text-muted-foreground" />
          <p className="eyebrow mt-6">Error 404</p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">
            We could not find that page
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            The link may be wrong, or the page may have moved. If you were following a booking, it
            will be on your requests list.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className={buttonVariants({ variant: "primary" })}>
              Go to the home page
            </Link>
            <a
              href={`tel:${BUSINESS.phoneHref}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Ring the workshop
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

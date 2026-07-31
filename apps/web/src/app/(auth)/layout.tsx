import Link from "next/link";
import { Phone } from "lucide-react";
import { BUSINESS } from "@chrysmec/shared";
import { Logo } from "@/components/brand/logo";
import { StageDial } from "@/components/brand/stage-dial";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * Split on a wide screen, stacked on anything narrower.
 *
 * The brand column used to appear only from the large breakpoint up, which left
 * every tablet and small laptop looking at a thin blue stub above a form
 * floating in an empty page. It now carries its weight at every width: a proper
 * band with the mark and what the business does, then the form in a card that
 * has somewhere to sit.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[5fr_6fr]">
      <aside className="paper-grain relative overflow-hidden bg-brand-surface text-brand-surface-foreground">
        <div className="relative z-10 flex flex-col gap-6 px-5 py-7 sm:px-8 lg:min-h-dvh lg:justify-between lg:px-12 lg:py-14">
          <Link
            href="/"
            aria-label={`${BUSINESS.name}, home`}
            className="inline-flex min-h-11 items-center self-start rounded-md"
          >
            <Logo accentClassName="stroke-accent-on-dark" />
          </Link>

          <div className="max-w-md lg:my-auto">
            <p className="font-mono text-xs tracking-[0.16em] text-brand-surface-foreground/65 uppercase">
              {BUSINESS.tagline}
            </p>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl lg:mt-5 lg:text-4xl">
              Know exactly where your vehicle is.
            </h2>
            <p className="mt-4 text-base text-brand-surface-foreground/80 lg:mt-5 lg:text-lg">
              Book a service, approve the estimate before work starts, and follow every stage
              through to ready.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href={`tel:${BUSINESS.phoneHref}`}
              className="inline-flex min-h-11 items-center gap-2 font-mono text-sm text-brand-surface-foreground/85 hover:text-brand-surface-foreground"
            >
              <Phone aria-hidden size={15} />
              {BUSINESS.phone}
            </a>
            <p className="font-mono text-xs tracking-[0.14em] text-brand-surface-foreground/55 uppercase">
              {BUSINESS.locations.join(" | ")}
            </p>
          </div>
        </div>

        {/* Quiet brand texture, cropped off the panel edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-28 -bottom-32 hidden w-[26rem] text-brand-surface-foreground opacity-[0.13] lg:block"
        >
          <StageDial />
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex justify-end px-5 pt-5 sm:px-8">
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:px-8">
          {/* The card gives the form an edge to sit against. Without it the
              fields were adrift in the middle of a very large white page. */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>
          </div>
        </div>
      </main>
    </div>
  );
}

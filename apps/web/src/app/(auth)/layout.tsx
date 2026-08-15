import Link from "next/link";
import { Phone } from "lucide-react";
import { BUSINESS } from "@chrysmec/shared";
import { Logo } from "@/components/brand/logo";
import { StageDial } from "@/components/brand/stage-dial";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * Split on a wide screen, and on a phone very nearly nothing but the form.
 *
 * The brand column used to run the full pitch at every width, which pushed the
 * sign in button off the bottom of a normal phone: you had to scroll past a
 * headline and a marketing paragraph before you could type your password. This
 * page has one job on a phone. The pitch is kept for the large breakpoint,
 * where there is a second column sitting empty anyway.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[5fr_6fr]">
      <aside className="paper-grain relative overflow-hidden bg-brand-surface text-brand-surface-foreground lg:min-h-dvh">
        <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:block lg:px-12 lg:py-14">
          <Link
            href="/"
            aria-label={`${BUSINESS.name}, home`}
            className="inline-flex min-h-11 items-center rounded-md"
          >
            <Logo accentClassName="stroke-accent-on-dark" />
          </Link>

          {/* On a phone the toggle rides in this bar rather than floating in
              the gap underneath it. */}
          <div className="lg:hidden">
            <ThemeToggle />
          </div>

          <div className="hidden lg:mt-16 lg:block">
            <p className="font-mono text-xs tracking-[0.16em] text-brand-surface-foreground/65 uppercase">
              {BUSINESS.tagline}
            </p>
            <h2 className="mt-5 max-w-md font-display text-4xl font-semibold tracking-[-0.02em] text-balance">
              Know exactly where your vehicle is.
            </h2>
            <p className="mt-5 max-w-md text-lg text-brand-surface-foreground/80">
              Book a service, approve the estimate before work starts, and follow every stage
              through to ready.
            </p>

            <div className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2">
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
        <div className="hidden justify-end px-5 pt-5 sm:px-8 lg:flex">
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-8 sm:px-8 sm:py-10">
          {/* Borderless on a phone, where the card edge only ate space that the
              form needed. It comes back from the small breakpoint up, where the
              form would otherwise be adrift in a wide column. */}
          <div className="sm:rounded-xl sm:border sm:border-border sm:bg-card sm:p-8">
            <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Cannot get in?{" "}
            <a
              href={`tel:${BUSINESS.phoneHref}`}
              className="font-mono text-foreground underline decoration-accent-text decoration-2 underline-offset-4"
            >
              Ring {BUSINESS.phone}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

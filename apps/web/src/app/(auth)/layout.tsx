import Link from "next/link";
import { BUSINESS } from "@chrysmec/shared";
import { Logo } from "@/components/brand/logo";
import { StageDial } from "@/components/brand/stage-dial";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * Stacked on a phone, split on a desktop. The pine panel carries the brand and
 * gives the paper-coloured form column something to sit against.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[5fr_6fr]">
      <aside className="paper-grain relative overflow-hidden bg-brand-surface px-5 py-6 text-brand-surface-foreground sm:px-8 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14">
        <Link
          href="/"
          aria-label={`${BUSINESS.name}, home`}
          className="relative z-10 inline-block rounded-md"
        >
          <Logo accentClassName="stroke-accent-on-dark" />
        </Link>

        <div className="relative z-10 mt-10 hidden max-w-md lg:mt-0 lg:block">
          <p className="font-mono text-xs tracking-[0.16em] text-brand-surface-foreground/60 uppercase">
            Booking and job tracking
          </p>
          <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.02em] text-balance">
            Know exactly where your vehicle is.
          </h2>
          <p className="mt-5 text-lg text-brand-surface-foreground/75">
            Book a service, approve the estimate before work starts, and follow every stage
            through to ready.
          </p>
        </div>

        <p className="relative z-10 mt-8 hidden font-mono text-xs tracking-[0.14em] text-brand-surface-foreground/55 uppercase lg:mt-0 lg:block">
          {BUSINESS.addressLines.join(" | ")}
        </p>

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
          <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>
        </div>
      </main>
    </div>
  );
}

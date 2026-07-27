import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { BUSINESS, SECTION_LABELS, SECTIONS, type Section } from "@chrysmec/shared";
import { Logo } from "@/components/brand/logo";
import { StageDial } from "@/components/brand/stage-dial";
import { SiteHeader } from "@/components/shared/site-header";
import { buttonVariants } from "@/components/ui/button";

const SECTION_COPY: Record<Section, { standfirst: string; work: readonly string[] }> = {
  MECHANICAL: {
    standfirst:
      "Engines, brakes, suspension, transmission and cooling. The work that keeps a vehicle moving and stopping the way it should.",
    work: [
      "Full engine service and diagnostics",
      "Brake pads, discs and fluid",
      "Suspension, steering and clutch repair",
      "Cooling system flush and hose replacement",
    ],
  },
  ELECTRICAL: {
    standfirst:
      "Batteries, charging, starting, lighting and the intermittent faults that other workshops send back unsolved.",
    work: [
      "Battery and alternator testing under load",
      "Starter motor repair and replacement",
      "Wiring faults traced circuit by circuit",
      "Air conditioning electrical repair",
    ],
  },
};

const PROCESS = [
  {
    title: "Tell us what it is doing",
    body: "Guided questions about the noise, when it happens and how bad it is, so a technician knows what to expect before the vehicle arrives.",
  },
  {
    title: "We diagnose and price it",
    body: "Your job goes to the right section and the right technician. You see the estimate and approve it before any work starts.",
  },
  {
    title: "Follow it through to ready",
    body: "Every stage is recorded with a timestamp. No more calling to ask whether the car is done.",
  },
] as const;

const phoneHref = `tel:${BUSINESS.phone.replace(/\s/g, "")}`;

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="paper-grain relative overflow-hidden border-b border-border">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-12 lg:items-center lg:gap-8 lg:py-32">
            <div className="rise-in lg:col-span-7">
              <p className="eyebrow">Mechanical and electrical | {BUSINESS.city}</p>
              <h1 className="mt-5 max-w-[15ch] font-display text-4xl font-semibold text-balance text-foreground sm:text-5xl">
                Your vehicle, handled by specialists.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Tell us what the car is doing and we will tell you what it needs, what it costs, and
                when it will be ready. No guesswork, no chasing us for an update.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/register" className={buttonVariants({ variant: "accent" })}>
                  Create an account
                  <ArrowRight aria-hidden size={18} />
                </Link>
                <a href={phoneHref} className={buttonVariants({ variant: "outline" })}>
                  <Phone aria-hidden size={18} />
                  {BUSINESS.phone}
                </a>
              </div>
            </div>

            <div
              className="pointer-events-none relative mx-auto w-full max-w-sm lg:col-span-5 lg:max-w-none"
              aria-hidden
            >
              <StageDial className="opacity-90" />
            </div>
          </div>
        </section>

        {/* The two sections */}
        <section id="what-we-work-on" className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="border-b border-border py-14 sm:py-20">
            <p className="eyebrow">What we work on</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold text-foreground">
              Two sections, one workshop, one record of the job.
            </h2>
          </div>

          {SECTIONS.map((section, index) => {
            const copy = SECTION_COPY[section];

            return (
              <article
                key={section}
                className="grid gap-6 border-b border-border py-12 sm:py-16 lg:grid-cols-12 lg:gap-10"
              >
                <div className="lg:col-span-4">
                  <span className="font-mono text-sm text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-foreground">
                    {SECTION_LABELS[section]}
                  </h3>
                </div>
                <div className="lg:col-span-8">
                  <p className="max-w-2xl text-lg text-muted-foreground">{copy.standfirst}</p>
                  <ul className="mt-7 grid gap-x-10 gap-y-3 sm:grid-cols-2">
                    {copy.work.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 border-t border-border pt-3 text-base text-foreground"
                      >
                        <span
                          aria-hidden
                          className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold text-foreground">
            You always know where your vehicle is.
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {PROCESS.map((step, index) => (
              <li key={step.title} className="border-t-2 border-foreground/85 pt-5">
                <span className="font-mono text-sm text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-base text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Visit */}
        <section id="visit" className="border-t border-border bg-muted/50">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="eyebrow">Visit the workshop</p>
              <address className="mt-4 text-2xl font-normal not-italic font-display text-foreground">
                {BUSINESS.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <a
                href={phoneHref}
                className="mt-6 inline-flex items-center gap-2 font-mono text-base text-foreground underline decoration-accent decoration-2 underline-offset-[6px] hover:decoration-foreground"
              >
                <Phone aria-hidden size={16} />
                {BUSINESS.phone}
              </a>
            </div>

            <div className="lg:col-span-7">
              <p className="eyebrow">Opening hours</p>
              <dl className="mt-4">
                {BUSINESS.openingHours.map((entry) => (
                  <div
                    key={entry.days}
                    className="flex items-baseline justify-between gap-6 border-b border-border py-4"
                  >
                    <dt className="text-base text-foreground">{entry.days}</dt>
                    <dd className="font-mono text-sm text-muted-foreground">{entry.hours}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo className="text-foreground" />
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {BUSINESS.tagline}
          </p>
        </div>
      </footer>
    </div>
  );
}

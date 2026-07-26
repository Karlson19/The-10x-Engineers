import { Clock, MapPin, Phone, Wrench, Zap } from "lucide-react";
import { BUSINESS, SECTION_LABELS, SECTIONS, type Section } from "@chrysmec/shared";
import { SiteHeader } from "@/components/shared/site-header";

const SECTION_COPY: Record<Section, { icon: typeof Wrench; summary: string; work: string[] }> = {
  MECHANICAL: {
    icon: Wrench,
    summary: "Engines, brakes, suspension, transmission and cooling.",
    work: [
      "Full engine service and diagnostics",
      "Brake pads, discs and fluid",
      "Suspension, steering and clutch repair",
    ],
  },
  ELECTRICAL: {
    icon: Zap,
    summary: "Batteries, charging, starting, lighting and wiring faults.",
    work: [
      "Battery and alternator testing",
      "Starter motor repair",
      "Intermittent wiring faults traced",
    ],
  },
};

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        <section className="border-b border-border bg-muted/40">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Spintex Road, Accra
            </p>
            <h1 className="mt-4 max-w-2xl font-display text-2xl font-semibold text-foreground sm:text-3xl">
              Vehicle repair and servicing, booked properly.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              Two sections, mechanical and electrical, one workshop. Tell us what the car is doing
              and we will tell you what it needs, what it costs, and when it will be ready.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 font-medium text-accent-foreground transition-colors hover:bg-accent-strong hover:text-white"
              >
                <Phone aria-hidden size={18} />
                Call to book
              </a>
              <a
                href="#what-we-work-on"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 font-medium text-foreground transition-colors hover:border-muted-foreground/60 hover:bg-muted"
              >
                What we work on
              </a>
            </div>
          </div>
        </section>

        <section id="what-we-work-on" className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="font-display text-xl font-semibold text-foreground">What we work on</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {SECTIONS.map((section) => {
              const copy = SECTION_COPY[section];
              const Icon = copy.icon;

              return (
                <article
                  key={section}
                  className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-muted-foreground/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-md bg-accent-subtle text-accent-foreground">
                      <Icon aria-hidden size={20} />
                    </span>
                    <h3 className="font-display text-lg font-semibold text-card-foreground">
                      {SECTION_LABELS[section]}
                    </h3>
                  </div>
                  <p className="mt-3 text-base text-muted-foreground">{copy.summary}</p>
                  <ul className="mt-4 space-y-2 text-sm text-card-foreground">
                    {copy.work.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section id="visit" className="border-t border-border bg-muted/40">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 sm:py-16">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Visit the workshop</h2>
              <address className="mt-4 space-y-1 not-italic text-base text-muted-foreground">
                {BUSINESS.addressLines.map((line) => (
                  <span key={line} className="flex items-start gap-2">
                    <MapPin aria-hidden size={18} className="mt-1 shrink-0 text-accent-strong" />
                    {line}
                  </span>
                ))}
                <span className="flex items-center gap-2 pt-2">
                  <Phone aria-hidden size={18} className="shrink-0 text-accent-strong" />
                  <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="font-mono">
                    {BUSINESS.phone}
                  </a>
                </span>
              </address>
            </div>

            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Opening hours</h2>
              <dl className="mt-4 space-y-2">
                {BUSINESS.openingHours.map((entry) => (
                  <div key={entry.days} className="flex items-center justify-between gap-4 text-base">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Clock aria-hidden size={18} className="shrink-0 text-accent-strong" />
                      {entry.days}
                    </dt>
                    <dd className="font-mono text-sm text-foreground">{entry.hours}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
          {BUSINESS.name}. {BUSINESS.tagline}
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { CATALOG } from "@/lib/mock-data";
import { formatGHS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-graphite text-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-display text-lg font-black uppercase tracking-tight text-paper">
          Chrysmec <span className="text-staff">Auto Center</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-paper/70 hover:text-paper">
            Log in
          </Link>
          <Link href="/login">
            <Button tone="staff">Book a technician</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <div className="label-eyebrow text-staff">Mobile mechanical &amp; electrical service</div>
          <h1 className="mt-3 max-w-xl font-display text-5xl font-black uppercase leading-[0.98] tracking-tight text-paper">
            We come to the car.
            <br />
            <span className="text-staff">Not the other way round.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-paper/70">
            Describe what your car is actually doing — not just &ldquo;it stopped&rdquo; —
            and a mechanical or electrical technician is dispatched to wherever it's parked.
            No queue, no notebook, no repeat trips for the wrong part.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button tone="staff" className="px-6 py-3 text-base">
                Book a service request
              </Button>
            </Link>
            <span className="text-xs text-paper/50">
              Works offline — your request is saved and sent once you're back online.
            </span>
          </div>
        </div>

        <div className="rounded-card border border-white/10 bg-graphite-soft p-1">
          <div className="rounded-[8px] bg-perforation bg-[length:100%_13px] p-4">
            <div className="rounded-card bg-white p-5 shadow-docket">
              <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                #sr-1001 · docket preview
              </div>
              <h3 className="mt-1 font-display text-lg text-ink">Toyota Corolla</h3>
              <p className="mt-2 text-sm text-ink-soft">
                Starting issue · intermittent · ignition cuts out repeatedly before failing.
              </p>
              <div className="mt-3 text-xs text-ink-faint">
                Mechanical · KNUST Main Gate · Tue 09:00
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-paper py-16 text-ink">
        <div className="mx-auto max-w-6xl px-6">
          <div className="label-eyebrow text-ink-faint">Service catalogue</div>
          <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
            What our technicians handle
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG.map((item) => (
              <Card key={item.id} className="p-5">
                <div className="label-eyebrow text-ink-faint">{item.section}</div>
                <h3 className="mt-1 font-display text-lg">{item.name}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{item.description}</p>
                <div className="mt-3 font-mono text-sm text-ink-faint">
                  from {formatGHS(item.basePrice)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-paper/40">
        Chrysmec Auto Center · Kumasi, Ghana
      </footer>
    </div>
  );
}

"use client";

import { Clock, RefreshCcw, AlertTriangle } from "lucide-react";
import { useOutboxEntries, useOutboxFlusher } from "@/lib/use-outbox";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { NetworkToggle } from "@/components/patterns/network-toggle";
import { symptomLabel, formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function OutboxPage() {
  const entries = useOutboxEntries();
  const flush = useOutboxFlusher();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="label-eyebrow">Saved on this device</div>
          <h1 className="mt-1 font-display text-2xl">Outbox</h1>
        </div>
        <NetworkToggle />
      </div>

      <p className="mb-5 text-sm text-ink-soft">
        Anything submitted while offline is stored here first, then sent automatically the
        moment you're back online — nothing is lost if your connection drops mid-request (F-13).
      </p>

      {entries && entries.length === 0 && (
        <EmptyState
          title="Outbox is empty"
          body="Every request you've submitted has been sent and confirmed by Chrysmec."
        />
      )}

      <div className="space-y-3">
        {entries?.map((e) => (
          <Card key={e.clientRequestId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  {e.clientRequestId}
                </div>
                <h3 className="mt-0.5 font-display text-base">
                  {e.payload.vehicleLabel} · {symptomLabel(e.payload.symptomCategory)}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">{e.payload.symptomDetails.description}</p>
              </div>
              <span
                className={cn(
                  "stamp flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1",
                  e.status === "FAILED"
                    ? "border-rust/30 bg-rust-soft text-rust"
                    : "border-staff/30 bg-staff-soft text-staff-ink"
                )}
              >
                {e.status === "FAILED" ? <AlertTriangle size={11} /> : <Clock size={11} />}
                {e.status === "FAILED" ? "Retry needed" : "Pending"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
              <span>Saved {formatRelative(e.createdAt)}</span>
              {e.attempts > 0 && <span>{e.attempts} failed attempt(s)</span>}
            </div>
          </Card>
        ))}
      </div>

      {entries && entries.length > 0 && (
        <Button variant="secondary" className="mt-4" onClick={() => flush()}>
          <RefreshCcw size={15} /> Try sending now
        </Button>
      )}
    </div>
  );
}

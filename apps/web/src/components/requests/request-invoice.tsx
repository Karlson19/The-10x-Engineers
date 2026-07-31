"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Receipt } from "lucide-react";
import type { RequestInvoice } from "@chrysmec/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useRequestInvoice } from "@/hooks/use-service-requests";
import { formatCurrency } from "@/lib/format";
import { motionTokens } from "@/lib/motion";

function Total({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "flex items-baseline justify-between gap-6 border-t-2 border-foreground/85 pt-3"
          : "flex items-baseline justify-between gap-6 py-1.5"
      }
    >
      <span
        className={
          emphasis
            ? "font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase"
            : "text-base text-muted-foreground"
        }
      >
        {label}
      </span>
      <span
        className={
          emphasis
            ? "font-mono text-2xl text-foreground"
            : "font-mono text-base text-muted-foreground"
        }
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

/**
 * What was actually done to the vehicle, and what it came to.
 *
 * The customer could see the estimate and then never see the bill, which is
 * the exact argument at handover this product is supposed to prevent. Before
 * the job is finished this is work so far rather than a final figure, and it
 * says so.
 */
export function RequestInvoicePanel({ requestId }: { requestId: string }) {
  const invoice = useRequestInvoice(requestId);
  const prefersReducedMotion = useReducedMotion();

  if (invoice.isPending) {
    return (
      <section className="mt-12" aria-busy="true">
        <span className="sr-only">Loading the work done</span>
        <Skeleton className="h-7 w-48" />
        <div className="mt-5 space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </section>
    );
  }

  if (invoice.isError) {
    return (
      <section className="mt-12">
        <ErrorState
          body="We could not load what has been done on this booking."
          onRetry={() => void invoice.refetch()}
          isRetrying={invoice.isRefetching}
        />
      </section>
    );
  }

  const data: RequestInvoice = invoice.data;

  // Nothing has been logged yet, so there is nothing honest to show.
  if (data.lines.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-foreground/85 pb-3">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {data.isFinal ? "What we did" : "Work so far"}
        </h2>
        <span className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {data.reference}
        </span>
      </div>

      {data.isFinal ? null : (
        <p className="mt-4 text-base text-muted-foreground">
          The job is still open, so this is what has been logged against it up to now rather than a
          final bill.
        </p>
      )}

      <ul className="mt-2">
        <AnimatePresence initial={false}>
          {data.lines.map((line, index) => (
            <motion.li
              key={line.id}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.base,
                ease: motionTokens.easeOut,
                delay: prefersReducedMotion ? 0 : Math.min(index, 8) * 0.04,
              }}
              className="flex items-baseline justify-between gap-4 border-b border-border py-3.5"
            >
              <div className="min-w-0">
                <p className="text-base text-foreground">{line.description}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {line.lineType === "PART" ? "Part" : "Labour"} | {line.quantity} x{" "}
                  {formatCurrency(line.unitCost)}
                </p>
              </div>
              <span className="shrink-0 font-mono text-base text-foreground">
                {formatCurrency(line.lineTotal)}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="mt-5 space-y-1">
        <Total label="Parts" value={data.partsTotal} />
        <Total label="Labour" value={data.labourTotal} />
      </div>

      <motion.div
        // Springs when the figure changes, because the total is the number the
        // customer came to this screen for.
        key={data.total}
        initial={prefersReducedMotion ? false : { scale: 0.98, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={motionTokens.spring}
        className="mt-3"
      >
        <Total label={data.isFinal ? "Total" : "So far"} value={data.total} emphasis />
      </motion.div>

      {data.estimatedCost && data.isFinal ? (
        <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <Receipt aria-hidden size={16} className="mt-0.5 shrink-0" />
          You approved an estimate of {formatCurrency(data.estimatedCost)}.
        </p>
      ) : null}
    </section>
  );
}

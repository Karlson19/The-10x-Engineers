"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { BanknoteX, CircleCheck, Clock, Receipt } from "lucide-react";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
} from "@chrysmec/shared";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { usePayments } from "@/hooks/use-payments";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Filter = PaymentStatus | "ALL";

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Everything" },
  { value: "SUCCESS", label: "Paid" },
  { value: "PENDING", label: "Started" },
  { value: "FAILED", label: "Failed" },
];

const STATUS_META = {
  SUCCESS: { tone: "done", icon: CircleCheck },
  PENDING: { tone: "neutral", icon: Clock },
  FAILED: { tone: "stopped", icon: BanknoteX },
} as const;

/**
 * The takings.
 *
 * Payments could be taken and then never seen: the endpoint has been there and
 * tested since the integration went in, with nothing rendering it. A workshop
 * that cannot tell you what it took today has not really been paid.
 */
export function PaymentsLedger() {
  const payments = usePayments();
  const [filter, setFilter] = useState<Filter>("ALL");
  const prefersReducedMotion = useReducedMotion();

  const rows = (payments.data?.data ?? []).filter((payment) =>
    filter === "ALL" ? true : payment.status === filter,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="eyebrow">Management</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">Payments</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Everything customers have settled, and everything still outstanding.
      </p>

      {/* Money taken leads, because it is the number anybody opens this for. */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
        <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
          Taken in total
        </p>
        {payments.isPending ? (
          <Skeleton className="mt-2 h-10 w-48" />
        ) : (
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
            className="mt-2 font-display text-4xl font-semibold text-card-foreground tabular-nums"
          >
            {formatCurrency(payments.data?.totalPaid ?? "0.00")}
          </motion.p>
        )}
        <p className="mt-1 text-base text-muted-foreground">
          Across every booking, from successful payments only.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "min-h-11 rounded-lg border px-4 text-sm transition-colors",
              filter === option.value
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {payments.isPending ? (
          <div className="space-y-2" aria-busy="true">
            <span className="sr-only">Loading payments</span>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-20" />
            ))}
          </div>
        ) : payments.isError ? (
          <ErrorState
            body="We could not load the payments. Check your connection and try again."
            onRetry={() => void payments.refetch()}
            isRetrying={payments.isRefetching}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={filter === "ALL" ? "Nothing taken yet" : "Nothing with that status"}
            body={
              filter === "ALL"
                ? "Payments appear here as customers settle their bills."
                : "Try a different filter."
            }
          />
        ) : (
          <ul className="grid gap-3">
            {rows.map((payment, index) => {
              const meta = STATUS_META[payment.status];
              const Icon = meta.icon;

              return (
                <motion.li
                  key={payment.id}
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: motionTokens.base,
                    ease: motionTokens.easeOut,
                    delay: prefersReducedMotion ? 0 : Math.min(index, 8) * 0.04,
                  }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <Link
                          href={`/dashboard/requests/${payment.serviceRequestId}`}
                          className="font-mono text-sm text-foreground underline decoration-accent decoration-2 underline-offset-[6px] hover:decoration-foreground"
                        >
                          {payment.requestReference}
                        </Link>
                        <Badge tone={meta.tone} icon={Icon}>
                          {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                        </Badge>
                      </div>

                      <p className="mt-2 text-base text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method} |{" "}
                        {formatDateTime(payment.createdAt)}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {payment.reference}
                      </p>
                    </div>

                    <p
                      className={cn(
                        "shrink-0 font-mono text-xl tabular-nums",
                        payment.status === "SUCCESS" ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { CircleCheck, CreditCard, Printer } from "lucide-react";
import {
  BUSINESS,
  PAYMENT_METHOD_LABELS,
  type Payment,
  type RequestInvoice,
} from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmPayment, useInitializePayment, usePayments } from "@/hooks/use-payments";
import { useRequestInvoice } from "@/hooks/use-service-requests";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { motionTokens } from "@/lib/motion";

function Receipt({ payment, invoice }: { payment: Payment; invoice: RequestInvoice | undefined }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
      // print:* rules turn this into a clean sheet when saved as a PDF from the
      // browser, which is every phone's share sheet and costs no dependency.
      className="rounded-xl border border-success/40 bg-success/5 p-5 sm:p-6 print:border-0 print:bg-transparent print:p-0"
    >
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden size={22} className="mt-0.5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold text-foreground">Paid in full</p>
          <p className="mt-1 text-base text-muted-foreground">
            {formatDateTime(payment.createdAt)}
          </p>
        </div>
      </div>

      <dl className="mt-5 space-y-2 border-t border-border pt-4">
        <div className="flex justify-between gap-4">
          <dt className="text-base text-muted-foreground">Amount</dt>
          <dd className="font-mono text-base text-foreground">{formatCurrency(payment.amount)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-base text-muted-foreground">Method</dt>
          <dd className="text-base text-foreground">
            {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-base text-muted-foreground">Receipt number</dt>
          <dd className="font-mono text-sm text-foreground">{payment.reference}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-base text-muted-foreground">Booking</dt>
          <dd className="font-mono text-sm text-foreground">{payment.requestReference}</dd>
        </div>
      </dl>

      {invoice && invoice.lines.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            What this covered
          </p>
          <ul className="mt-3 space-y-1.5">
            {invoice.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  {line.description}
                  {line.quantity > 1 ? ` x ${line.quantity}` : ""}
                </span>
                <span className="shrink-0 font-mono text-foreground">
                  {formatCurrency(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
        {BUSINESS.name} | {BUSINESS.phone} | {BUSINESS.locations.join(", ")}
      </p>

      <Button
        variant="outline"
        size="sm"
        className="mt-5 print:hidden"
        onClick={() => window.print()}
      >
        <Printer aria-hidden size={16} />
        Print or save as PDF
      </Button>
    </motion.div>
  );
}

/**
 * Settling the bill, and the receipt afterwards.
 *
 * Only ever shown on a finished booking. The amount is never sent from here:
 * the server works out what is owed from the work log, because a browser that
 * could name its own price would be a hole big enough to drive a car through.
 */
export function RequestPayment({ requestId }: { requestId: string }) {
  const payments = usePayments(requestId);
  const invoice = useRequestInvoice(requestId);
  const startPayment = useInitializePayment();
  const confirm = useConfirmPayment();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const confirmedRef = useRef(false);

  const justPaid = searchParams.get("paid") === "1";

  /*
    Coming back from Paystack. The redirect proves nothing on its own, so ask
    the server to check with the provider, and only once: the guard stops a
    re-render turning into a second confirmation.
  */
  useEffect(() => {
    if (!justPaid || confirmedRef.current) {
      return;
    }

    const pending = payments.data?.data.find((item) => item.status === "PENDING");
    if (!pending) {
      return;
    }

    confirmedRef.current = true;
    confirm
      .mutateAsync(pending.reference)
      .catch(() => setError("We could not confirm that payment. Give it a moment and refresh."))
      .finally(() => router.replace(`/dashboard/requests/${requestId}`, { scroll: false }));
  }, [justPaid, payments.data, confirm, router, requestId]);

  async function pay(): Promise<void> {
    setError(null);

    try {
      const result = await startPayment.mutateAsync(requestId);
      // Paystack hosts the card form. We never see a card number.
      window.location.href = result.authorizationUrl;
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not start the payment. Check your connection and try again.",
      );
    }
  }

  if (payments.isPending) {
    return (
      <section className="mt-12" aria-busy="true">
        <span className="sr-only">Loading payment</span>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-5 h-28" />
      </section>
    );
  }

  const settled = payments.data?.data.find((item) => item.status === "SUCCESS");
  const outstanding = invoice.data ? Number.parseFloat(invoice.data.total) : 0;
  const paidTotal = Number.parseFloat(payments.data?.totalPaid ?? "0");
  const owed = Math.max(outstanding - paidTotal, 0);

  return (
    <section className="mt-12">
      <h2 className="mb-5 border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
        {settled ? "Your receipt" : "Settle the bill"}
      </h2>

      {error ? (
        <Alert tone="error" title="Payment problem" className="mb-5">
          {error}
        </Alert>
      ) : null}

      {confirm.isPending ? (
        <p className="mb-5 text-base text-muted-foreground">Confirming your payment.</p>
      ) : null}

      {settled ? (
        <Receipt payment={settled} invoice={invoice.data} />
      ) : owed <= 0 ? (
        <p className="text-base text-muted-foreground">
          There is nothing to pay on this booking.
        </p>
      ) : (
        <div className="rounded-xl border border-accent/40 bg-accent-subtle/60 p-5 sm:p-6">
          <p className="eyebrow">Amount due</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-foreground">
            {formatCurrency(owed)}
          </p>
          <p className="mt-3 text-base text-foreground/80">
            Pay by card or mobile money. You will be taken to our payment provider and brought
            straight back here.
          </p>

          <Button
            variant="accent"
            className="mt-5"
            onClick={() => void pay()}
            isPending={startPayment.isPending}
            pendingLabel="Opening"
          >
            <CreditCard aria-hidden size={18} />
            Pay {formatCurrency(owed)}
          </Button>
        </div>
      )}
    </section>
  );
}

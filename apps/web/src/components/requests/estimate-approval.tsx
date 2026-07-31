"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { ServiceRequest } from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useUpdateServiceRequestStatus } from "@/hooks/use-service-requests";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";

/**
 * The decision the customer is being asked to make, on the screen where they
 * are already looking at the job. Without this the booking sits at awaiting
 * approval and the only way forward is a phone call, which is the exact thing
 * this product exists to remove.
 *
 * Approving is the copper action because it is the one the customer came here
 * to take. Declining cancels the booking outright, so it asks first.
 */
export function EstimateApproval({ request }: { request: ServiceRequest }) {
  const updateStatus = useUpdateServiceRequestStatus(request.id);
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isDeclining, setIsDeclining] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<"approve" | "decline" | null>(null);

  async function respond(choice: "approve" | "decline"): Promise<void> {
    setError(null);
    setPendingChoice(choice);

    try {
      await updateStatus.mutateAsync({
        status: choice === "approve" ? "IN_PROGRESS" : "CANCELLED",
      });

      setIsDeclining(false);
      showToast(
        choice === "approve"
          ? {
              tone: "success",
              title: "Estimate approved",
              body: "The technician has been told and work can carry on.",
            }
          : {
              tone: "info",
              title: "Estimate declined",
              body: "The booking has been cancelled and the workshop has been told.",
            },
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not send your answer. Check your connection and try again.",
      );
    } finally {
      setPendingChoice(null);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="mb-5 border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
        Your approval is needed
      </h2>

      <div className="rounded-lg border border-accent/40 bg-accent-subtle/60 p-5 sm:p-6">
        <p className="eyebrow">Estimate</p>
        <p className="mt-1 font-mono text-3xl font-semibold text-foreground">
          {request.estimatedCost ? formatCurrency(request.estimatedCost) : "Not priced yet"}
        </p>
        <p className="mt-3 text-base text-foreground/80">
          {request.job
            ? `${request.job.assignedStaff.fullName} has looked at your vehicle and priced the work.`
            : "The workshop has looked at your vehicle and priced the work."}{" "}
          Nothing further is done until you answer.
        </p>

        {error ? (
          <Alert tone="error" title="Could not send your answer" className="mt-5">
            {error}
          </Alert>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="accent"
            onClick={() => void respond("approve")}
            isPending={pendingChoice === "approve"}
            pendingLabel="Approving"
            disabled={updateStatus.isPending}
          >
            <Check aria-hidden size={18} />
            Approve and carry on
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsDeclining(true)}
            disabled={updateStatus.isPending}
          >
            <X aria-hidden size={18} />
            Decline
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={isDeclining}
        onClose={() => setIsDeclining(false)}
        onConfirm={() => void respond("decline")}
        title="Decline this estimate?"
        description="Declining cancels the booking. The workshop stops work and you will need to book again if you change your mind."
        confirmLabel="Decline and cancel"
        cancelLabel="Go back"
        isPending={pendingChoice === "decline"}
        pendingLabel="Declining"
      />
    </section>
  );
}

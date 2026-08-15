"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import {
  SECTION_LABELS,
  describeSymptomAnswers,
  getSymptomCategory,
} from "@chrysmec/shared";
import { EstimateApproval } from "@/components/requests/estimate-approval";
import { RequestFeedback } from "@/components/requests/request-feedback";
import { RequestInvoicePanel } from "@/components/requests/request-invoice";
import { RequestPayment } from "@/components/requests/request-payment";
import { StatusTimeline } from "@/components/requests/status-timeline";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useDeleteServiceRequest, useServiceRequest, useTimeline } from "@/hooks/use-service-requests";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Reveal } from "@/components/shared/reveal";
import { STATUS_META, statusTone } from "@/lib/status";

/* Its own chunk, downloaded only when a location was actually pinned. */
const LocationMap = dynamic(
  () => import("@/components/shared/location-map").then((module) => module.LocationMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  },
);

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3.5 sm:flex-row sm:items-baseline sm:gap-8">
      <dt className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase sm:w-40 sm:shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-base text-foreground">{children}</dd>
    </div>
  );
}

export function RequestDetail({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justBooked = searchParams.get("booked") === "1";

  const request = useServiceRequest(id);
  const timeline = useTimeline(id, request.data?.status);
  const deleteMutation = useDeleteServiceRequest();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (request.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-5 py-10 sm:px-8 sm:py-14" aria-busy="true">
        <span className="sr-only">Loading this booking</span>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (request.isError) {
    const notFound = request.error instanceof ApiError && request.error.status === 404;

    return (
      <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <ErrorState
          title={notFound ? "We could not find that booking" : "Could not load this booking"}
          body={
            notFound
              ? "It may have been removed, or the link may be wrong."
              : "Check your connection and try again."
          }
          onRetry={notFound ? undefined : () => void request.refetch()}
          isRetrying={request.isRefetching}
        />
        <Link
          href="/dashboard/requests"
          className="mt-6 inline-flex items-center gap-2 text-base text-foreground underline decoration-accent-text decoration-2 underline-offset-4"
        >
          <ArrowLeft aria-hidden size={18} />
          Back to my requests
        </Link>
      </div>
    );
  }

  const data = request.data;
  const meta = STATUS_META[data.status];
  const category = getSymptomCategory(data.symptomCategory);
  const answers = category ? describeSymptomAnswers(category, data.symptomDetails) : [];
  const canRemove = data.status === "SUBMITTED";

  async function handleDelete(): Promise<void> {
    setDeleteError(null);

    try {
      await deleteMutation.mutateAsync(id);
      router.replace("/dashboard/requests");
    } catch (error) {
      setIsConfirmingDelete(false);
      setDeleteError(
        error instanceof ApiError
          ? error.message
          : "Could not remove the booking. Check your connection and try again.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/dashboard/requests"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden size={16} />
        My requests
      </Link>

      {justBooked ? (
        <Alert tone="success" title="Booking sent" className="mt-6">
          We have your booking. You will see it move through the stages below as we work on it.
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-sm text-muted-foreground">{data.reference}</span>
        <Badge tone={statusTone(data.status)} icon={meta.icon}>
          {meta.customerLabel}
        </Badge>
      </div>

      <h1 className="mt-3 font-display text-4xl font-semibold text-foreground">
        {data.vehicle.make} {data.vehicle.model}
      </h1>
      <p className="mt-2 font-mono text-sm text-muted-foreground">
        {data.vehicle.registrationNo} | {data.vehicle.year}
      </p>

      {/* The signature screen: where the vehicle is, at a glance. */}
      <Reveal as="section" delay={0.05} className="mt-12">
        <h2 className="mb-7 border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
          Progress
        </h2>

        {timeline.isPending ? (
          <div className="space-y-6" aria-busy="true">
            <span className="sr-only">Loading the timeline</span>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : timeline.isError ? (
          <ErrorState
            body="We could not load the progress of this booking."
            onRetry={() => void timeline.refetch()}
            isRetrying={timeline.isRefetching}
          />
        ) : (
          <StatusTimeline status={data.status} events={timeline.data} />
        )}
      </Reveal>

      {data.status === "AWAITING_APPROVAL" ? <EstimateApproval request={data} /> : null}

      {/* What was done and what it came to, once there is anything to show. */}
      {data.status === "CANCELLED" ? null : <RequestInvoicePanel requestId={id} />}

      {data.status === "COMPLETED" ? <RequestPayment requestId={id} /> : null}

      {data.status === "COMPLETED" ? <RequestFeedback requestId={id} /> : null}

      <Reveal as="section" delay={0.1} className="mt-12">
        <h2 className="mb-2 border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
          Booking details
        </h2>
        <dl>
          <DetailRow label="Work">
            {SECTION_LABELS[data.section]}
            {category ? `, ${category.label.toLowerCase()}` : ""}
          </DetailRow>
          <DetailRow label="Booked for">{formatDateTime(data.preferredDateTime)}</DetailRow>
          <DetailRow label="Location">
            <span className="inline-flex items-start gap-2">
              <MapPin aria-hidden size={18} className="mt-1 shrink-0 text-muted-foreground" />
              {data.locationText}
            </span>
            {/* Shown back so the customer can see the pin landed where they
                meant it to, while there is still time to say otherwise. */}
            {typeof data.latitude === "number" && typeof data.longitude === "number" ? (
              <div className="mt-3">
                <LocationMap
                  latitude={data.latitude}
                  longitude={data.longitude}
                  label={`${data.vehicle.make} ${data.vehicle.model}, ${data.locationText}`}
                />
              </div>
            ) : null}
          </DetailRow>
          {data.job ? (
            <DetailRow label="Technician">{data.job.assignedStaff.fullName}</DetailRow>
          ) : null}
          {data.estimatedCost ? (
            <DetailRow label="Estimate">
              <span className="font-mono">{formatCurrency(data.estimatedCost)}</span>
            </DetailRow>
          ) : null}
          {data.requestedServices.length > 0 ? (
            <DetailRow label="Services asked for">
              <ul className="space-y-1.5">
                {data.requestedServices.map((service) => (
                  <li key={service.id} className="flex flex-wrap justify-between gap-x-4">
                    <span>{service.name}</span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {formatCurrency(service.basePrice)}
                    </span>
                  </li>
                ))}
              </ul>
            </DetailRow>
          ) : null}
          <DetailRow label="Booked on">{formatDateTime(data.createdAt)}</DetailRow>
        </dl>
      </Reveal>

      {answers.length > 0 ? (
        <Reveal as="section" delay={0.15} className="mt-12">
          <h2 className="mb-2 border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
            What you told us
          </h2>
          <dl>
            {answers.map((line) => (
              <DetailRow key={line.question} label={line.question}>
                {line.answer}
              </DetailRow>
            ))}
          </dl>
        </Reveal>
      ) : null}

      {deleteError ? (
        <Alert tone="error" title="Could not remove the booking" className="mt-8">
          {deleteError}
        </Alert>
      ) : null}

      {canRemove ? (
        <div className="mt-10 border-t border-border pt-6">
          <p className="text-base text-muted-foreground">
            This booking has not been scheduled yet, so you can still remove it.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setIsConfirmingDelete(true)}>
            Remove this booking
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={() => void handleDelete()}
        title="Remove this booking?"
        description={`${data.reference} will be removed and the workshop will not see it. This cannot be undone.`}
        confirmLabel="Remove it"
        isPending={deleteMutation.isPending}
        pendingLabel="Removing"
      />
    </div>
  );
}

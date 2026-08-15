"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import {
  REQUEST_STATUS_LABELS,
  type RequestStatus,
  STATUS_TRANSITIONS,
  describeSymptomAnswers,
  getSymptomCategory,
} from "@chrysmec/shared";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { WorkLogEditor } from "@/components/jobs/work-log-editor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { VehicleSilhouette } from "@/components/vehicles/vehicle-silhouette";

/*
  Leaflet and its stylesheet are heavy and need a real window, so they load in
  their own chunk and only on a job where the customer actually pinned
  themselves. A job at the workshop never downloads a mapping library.
*/
const LocationMap = dynamic(
  () => import("@/components/shared/location-map").then((module) => module.LocationMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  },
);
import { useJob, useUpdateJob } from "@/hooks/use-jobs";
import { useServiceRequest, useUpdateServiceRequestStatus } from "@/hooks/use-service-requests";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { STATUS_META } from "@/lib/status";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3.5 sm:flex-row sm:items-baseline sm:gap-8">
      <dt className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase sm:w-40 sm:shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-base text-foreground">{children}</dd>
    </div>
  );
}

export function JobDetail({ jobId }: { jobId: string }) {
  const job = useJob(jobId);
  const updateJob = useUpdateJob(jobId);
  const serviceRequest = useServiceRequest(job.data?.serviceRequestId ?? "");
  const updateStatus = useUpdateServiceRequestStatus(job.data?.serviceRequestId ?? "");

  const [notes, setNotes] = useState<string | null>(null);
  const [estimate, setEstimate] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  if (job.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-5 py-10 sm:px-8" aria-busy="true">
        <span className="sr-only">Loading the job</span>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (job.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
        <ErrorState
          body="We could not load this job. It may have been reassigned, or your connection dropped."
          onRetry={() => void job.refetch()}
          isRetrying={job.isRefetching}
        />
      </div>
    );
  }

  const data = job.data;
  const category = getSymptomCategory(data.symptomCategory);
  const requestStatus = (serviceRequest.data?.status ?? data.requestStatus) as RequestStatus;
  const allowedMoves = STATUS_TRANSITIONS[requestStatus] ?? [];
  const diagnosis = notes ?? data.diagnosisNotes ?? "";
  const answers =
    category && serviceRequest.data
      ? describeSymptomAnswers(category, serviceRequest.data.symptomDetails)
      : [];

  /*
    Only when the customer actually pinned themselves, so the map never loads
    for a job that is sitting at the workshop. Read as real numbers rather than
    against null, because a record written before these fields existed has no
    key for them and undefined is not null.
  */
  const booking = serviceRequest.data;
  const pin =
    booking && typeof booking.latitude === "number" && typeof booking.longitude === "number"
      ? {
          latitude: booking.latitude,
          longitude: booking.longitude,
          locationText: booking.locationText,
        }
      : null;

  async function saveDiagnosis(): Promise<void> {
    setActionError(null);

    try {
      await updateJob.mutateAsync({ diagnosisNotes: diagnosis });
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Could not save your notes. Check your connection and try again.",
      );
    }
  }

  async function moveRequest(to: RequestStatus, estimatedCost?: string): Promise<void> {
    setActionError(null);
    try {
      await updateStatus.mutateAsync(
        estimatedCost ? { status: to, estimatedCost } : { status: to },
      );
      if (to === "IN_PROGRESS" && data.status === "ASSIGNED") {
        await updateJob.mutateAsync({ status: "IN_PROGRESS" });
      }
      if (to === "COMPLETED") {
        await updateJob.mutateAsync({ status: "COMPLETED" });
      }
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Could not update this job. Check your connection and try again.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/staff"
        className="inline-flex min-h-11 items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden size={18} />
        Back to the queue
      </Link>

      {/* The vehicle first, because a technician walking up to a car wants to
          know it is the right one before anything else. */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
        <VehicleSilhouette
          make={data.vehicle.make}
          model={data.vehicle.model}
          className="w-44 self-center sm:w-52 sm:shrink-0"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-sm text-muted-foreground">{data.reference}</span>
            <JobStatusBadge status={data.status} />
          </div>

          <h1 className="mt-3 font-display text-4xl font-semibold text-foreground">
            {data.vehicle.make} {data.vehicle.model}
          </h1>
          <p className="mt-2 font-mono text-base text-muted-foreground">
            {data.vehicle.registrationNo} | {data.vehicle.year}
          </p>
        </div>
      </div>

      {actionError ? (
        <Alert tone="error" title="Could not update" className="mt-6">
          {actionError}
        </Alert>
      ) : null}

      <section className="mt-10">
        <h2 className="border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
          Customer and vehicle
        </h2>
        <dl>
          <Row label="Customer">{data.client.fullName}</Row>
          <Row label="Phone">
            <a href={`tel:${data.client.phone}`} className="font-mono underline underline-offset-4">
              {data.client.phone}
            </a>
          </Row>
          <Row label="Expected">{formatDateTime(data.preferredDateTime)}</Row>
          {serviceRequest.data ? (
            <Row label="Where">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {serviceRequest.data.locationText}
                {/*
                  The customer pinned where the vehicle is, so hand it straight
                  to whatever map app is on this phone rather than drawing one.
                  This is the difference between "roadside, Kumasi to Accra
                  road" and being able to actually go there.
                */}
                {serviceRequest.data.latitude !== null &&
                serviceRequest.data.longitude !== null ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${serviceRequest.data.latitude},${serviceRequest.data.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 font-mono text-sm text-foreground underline decoration-accent-text decoration-2 underline-offset-4"
                  >
                    <MapPin aria-hidden size={15} />
                    Directions
                  </a>
                ) : null}
              </span>
            </Row>
          ) : null}
          <Row label="Booking status">{REQUEST_STATUS_LABELS[requestStatus]}</Row>
          {/* Drawn only when the customer actually pinned themselves, so the
              map never loads on a job at the workshop. */}
          {pin ? (
            <Row label="On the map">
              <LocationMap
                latitude={pin.latitude}
                longitude={pin.longitude}
                label={`${data.vehicle.make} ${data.vehicle.model}, ${pin.locationText}`}
              />
            </Row>
          ) : null}
          {data.estimatedCost ? (
            <Row label="Estimate">{formatCurrency(data.estimatedCost)}</Row>
          ) : null}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
          What the customer told us
        </h2>
        {serviceRequest.isPending ? (
          <div className="space-y-2 py-4" aria-busy="true">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : answers.length === 0 ? (
          <p className="py-4 text-base text-muted-foreground">
            {category ? category.label : "No intake recorded."}
          </p>
        ) : (
          <dl>
            {answers.map((line) => (
              <Row key={line.question} label={line.question.replace(/\?$/, "")}>
                {line.answer}
              </Row>
            ))}
          </dl>
        )}
      </section>

      <section className="mt-10">
        <h2 className="border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
          Diagnosis
        </h2>
        <div className="pt-4">
          <FormField id="diagnosisNotes" label="What you found">
            {(field) => (
              <Textarea
                {...field}
                value={diagnosis}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What you found on inspection, and what it needs."
                disabled={data.status === "COMPLETED"}
              />
            )}
          </FormField>
          {data.status === "COMPLETED" ? null : (
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => void saveDiagnosis()}
              isPending={updateJob.isPending}
              pendingLabel="Saving"
            >
              Save notes
            </Button>
          )}
        </div>
      </section>

      <section className="mt-10">
        <WorkLogEditor
          jobId={jobId}
          section={data.section}
          isLocked={data.status === "COMPLETED"}
        />
      </section>

      <section className="mt-10">
        <h2 className="border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
          Move this job on
        </h2>

        {allowedMoves.length === 0 ? (
          <p className="pt-4 text-base text-muted-foreground">
            This booking is {REQUEST_STATUS_LABELS[requestStatus].toLowerCase()}, so it cannot move
            again.
          </p>
        ) : (
          <div className="space-y-4 pt-4">
            {allowedMoves.includes("AWAITING_APPROVAL") ? (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-lg font-semibold text-card-foreground">
                  Send an estimate
                </h3>
                <p className="mt-1 text-base text-muted-foreground">
                  The customer sees this figure and approves it before you carry on.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <FormField id="estimatedCost" label="Estimate" className="flex-1">
                    {(field) => (
                      <Input
                        {...field}
                        inputMode="decimal"
                        value={estimate}
                        onChange={(event) => setEstimate(event.target.value)}
                        placeholder="1250.00"
                      />
                    )}
                  </FormField>
                  <Button
                    variant="accent"
                    className="sm:mb-6"
                    onClick={() => void moveRequest("AWAITING_APPROVAL", estimate)}
                    isPending={updateStatus.isPending}
                    pendingLabel="Sending"
                  >
                    Send for approval
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {allowedMoves
                .filter((status) => status !== "AWAITING_APPROVAL")
                .map((status) => {
                  const Icon = STATUS_META[status].icon;

                  return (
                    <Button
                      key={status}
                      variant={status === "CANCELLED" ? "outline" : "primary"}
                      onClick={() => void moveRequest(status)}
                      isPending={updateStatus.isPending}
                      pendingLabel="Updating"
                    >
                      <Icon aria-hidden size={18} />
                      Mark {REQUEST_STATUS_LABELS[status].toLowerCase()}
                    </Button>
                  );
                })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

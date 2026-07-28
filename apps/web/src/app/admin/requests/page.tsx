"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import {
  REQUEST_STATUSES,
  SECTION_LABELS,
  type RequestStatus,
  getSymptomCategory,
} from "@chrysmec/shared";
import { RequestAssigner } from "@/components/admin/request-assigner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useServiceRequests } from "@/hooks/use-service-requests";
import { formatDateTime } from "@/lib/format";
import { STATUS_META, statusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

type Filter = RequestStatus | "ALL";

export default function AdminRequestsPage() {
  const [status, setStatus] = useState<Filter>("SUBMITTED");
  const requests = useServiceRequests(status === "ALL" ? {} : { status });

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="eyebrow">Management</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">Requests</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Every booking across both sections. Assign a technician to turn one into a job.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {(["ALL", ...REQUEST_STATUSES] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={status === option}
            onClick={() => setStatus(option)}
            className={cn(
              "min-h-11 rounded-lg border px-4 text-sm transition-colors",
              status === option
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {option === "ALL" ? "All" : STATUS_META[option].label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {requests.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Loading requests</span>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-28" />
            ))}
          </div>
        ) : null}

        {requests.isError ? (
          <ErrorState
            body="We could not load the requests. Check your connection and try again."
            onRetry={() => void requests.refetch()}
            isRetrying={requests.isRefetching}
          />
        ) : null}

        {requests.isSuccess && requests.data.data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nothing in this view"
            body="No bookings have this status right now. Choose another filter."
          />
        ) : null}

        {requests.isSuccess && requests.data.data.length > 0 ? (
          <ul className="space-y-3">
            {requests.data.data.map((serviceRequest) => {
              const meta = STATUS_META[serviceRequest.status];

              return (
                <li
                  key={serviceRequest.id}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <Link
                          href={`/dashboard/requests/${serviceRequest.id}`}
                          className="font-mono text-sm text-foreground underline decoration-accent decoration-2 underline-offset-[6px] hover:decoration-foreground"
                        >
                          {serviceRequest.reference}
                        </Link>
                        <Badge tone={statusTone(serviceRequest.status)} icon={meta.icon}>
                          {meta.label}
                        </Badge>
                      </div>

                      <h2 className="mt-2 font-display text-xl font-semibold text-card-foreground">
                        {serviceRequest.vehicle.make} {serviceRequest.vehicle.model}
                      </h2>

                      <p className="mt-1 text-base text-muted-foreground">
                        {serviceRequest.client.fullName} |{" "}
                        {SECTION_LABELS[serviceRequest.section]},{" "}
                        {(
                          getSymptomCategory(serviceRequest.symptomCategory)?.label ??
                          serviceRequest.symptomCategory
                        ).toLowerCase()}
                      </p>

                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        {serviceRequest.vehicle.registrationNo} |{" "}
                        {formatDateTime(serviceRequest.preferredDateTime)}
                      </p>
                    </div>

                    <RequestAssigner serviceRequest={serviceRequest} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

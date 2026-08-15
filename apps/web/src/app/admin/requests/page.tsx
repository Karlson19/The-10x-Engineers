"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ClipboardList } from "lucide-react";
import {
  REQUEST_STATUSES,
  SECTIONS,
  SECTION_LABELS,
  type RequestStatus,
  type Section,
  getSymptomCategory,
} from "@chrysmec/shared";
import { RequestAssigner } from "@/components/admin/request-assigner";
import { StageDots } from "@/components/requests/stage-dots";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { VehicleSilhouette } from "@/components/vehicles/vehicle-silhouette";
import { useDebounced } from "@/hooks/use-debounced";
import { useServiceRequests } from "@/hooks/use-service-requests";
import { formatDateTime } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { STATUS_META, statusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

type Filter = RequestStatus | "ALL";

export default function AdminRequestsPage() {
  const [status, setStatus] = useState<Filter>("SUBMITTED");
  const [section, setSection] = useState<Section | "ALL">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  /*
    The typing is not sent on every keystroke. Each one would be a request over
    mobile data, and the answer to a half typed registration is noise.
  */
  const search = useDebounced(searchInput.trim(), 300);

  const requests = useServiceRequests({
    ...(status === "ALL" ? {} : { status }),
    ...(section === "ALL" ? {} : { section }),
    ...(search.length > 0 ? { search } : {}),
    page,
    limit: 20,
  });

  /** Any change of filter starts again at the first page. */
  function refine(change: () => void): void {
    change();
    setPage(1);
  }

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
            onClick={() => refine(() => setStatus(option))}
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

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="sm:max-w-xs sm:flex-1">
          <label htmlFor="request-search" className="sr-only">
            Search bookings
          </label>
          <Input
            id="request-search"
            type="search"
            value={searchInput}
            placeholder="Reference, registration, name or phone"
            onChange={(event) => refine(() => setSearchInput(event.target.value))}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["ALL", ...SECTIONS] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={section === option}
              onClick={() => refine(() => setSection(option))}
              className={cn(
                "min-h-11 rounded-lg border px-4 text-sm transition-colors",
                section === option
                  ? "border-foreground bg-foreground text-background"
                  : "border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              {option === "ALL" ? "Both sections" : SECTION_LABELS[option]}
            </button>
          ))}
        </div>
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
            title="Nothing matches"
            body={
              search.length > 0
                ? `No booking matches "${search}". Try a registration, a reference like CH-7F3A21, or a customer's name.`
                : "No bookings match these filters right now. Choose another status or section."
            }
          />
        ) : null}

        {requests.isSuccess && requests.data.data.length > 0 ? (
          <ul className="space-y-3">
            {requests.data.data.map((serviceRequest, index) => {
              const meta = STATUS_META[serviceRequest.status];
              const isUnassigned = !serviceRequest.job;

              return (
                <motion.li
                  key={serviceRequest.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: motionTokens.base,
                    ease: motionTokens.easeOut,
                    delay: Math.min(index, 8) * 0.04,
                  }}
                  className={cn(
                    "rounded-xl border bg-card p-5",
                    "transition-colors duration-150 motion-reduce:transition-none",
                    // A booking with nobody on it is the thing management is
                    // here to fix, so it is marked rather than left to be found.
                    isUnassigned ? "border-accent/45" : "border-border",
                  )}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-5">
                      <VehicleSilhouette
                        make={serviceRequest.vehicle.make}
                        model={serviceRequest.vehicle.model}
                        className="hidden w-28 shrink-0 self-center sm:block"
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <Link
                            href={`/dashboard/requests/${serviceRequest.id}`}
                            className="font-mono text-sm text-foreground underline decoration-accent-text decoration-2 underline-offset-[6px] hover:decoration-foreground"
                          >
                            {serviceRequest.reference}
                          </Link>
                          <Badge tone={statusTone(serviceRequest.status)} icon={meta.icon}>
                            {meta.label}
                          </Badge>
                          {isUnassigned ? (
                            <span className="font-mono text-xs tracking-[0.1em] text-accent-text uppercase">
                              Nobody assigned
                            </span>
                          ) : null}
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

                        <StageDots status={serviceRequest.status} className="mt-3" />

                        <p className="mt-2 font-mono text-xs text-muted-foreground">
                          {serviceRequest.vehicle.registrationNo} |{" "}
                          {formatDateTime(serviceRequest.preferredDateTime)}
                        </p>
                      </div>
                    </div>

                    <RequestAssigner serviceRequest={serviceRequest} />
                  </div>
                </motion.li>
              );
            })}
          </ul>
        ) : null}

        {requests.isSuccess && requests.data.data.length > 0 ? (
          <Pagination
            page={requests.data.meta.page}
            totalPages={requests.data.meta.totalPages}
            total={requests.data.meta.total}
            label="bookings"
            onChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { type JobStatus, getSymptomCategory } from "@chrysmec/shared";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useJobs } from "@/hooks/use-jobs";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = JobStatus | "ALL";

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
];

const WHEN_FILTERS = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "Any date" },
] as const;

type WhenFilter = (typeof WHEN_FILTERS)[number]["value"];

function QueueSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading the job queue</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="border-b border-border py-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-6 w-56" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

export function JobQueue() {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [when, setWhen] = useState<WhenFilter>("all");

  const jobs = useJobs({
    ...(status === "ALL" ? {} : { status }),
    scheduledFor: when,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="eyebrow">Workshop floor</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">Job queue</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Your assigned work, in the order the vehicles are expected.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={status === filter.value}
            onClick={() => setStatus(filter.value)}
            className={cn(
              "min-h-11 rounded-lg border px-4 text-sm transition-colors",
              status === filter.value
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {WHEN_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={when === filter.value}
            onClick={() => setWhen(filter.value)}
            className={cn(
              "min-h-11 rounded-lg px-3 font-mono text-xs tracking-[0.1em] uppercase transition-colors",
              when === filter.value
                ? "bg-accent-subtle text-accent-hover dark:bg-accent/15 dark:text-accent"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {jobs.isPending ? <QueueSkeleton /> : null}

        {jobs.isError ? (
          <ErrorState
            body="We could not load the job queue. Check your connection and try again."
            onRetry={() => void jobs.refetch()}
            isRetrying={jobs.isRefetching}
          />
        ) : null}

        {jobs.isSuccess && jobs.data.data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nothing in this view"
            body="No jobs match the filters you have chosen. Try widening the date range."
          />
        ) : null}

        {jobs.isSuccess && jobs.data.data.length > 0 ? (
          <ul>
            {jobs.data.data.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/staff/jobs/${job.id}`}
                  className="group flex items-center gap-4 border-b border-border py-5 transition-[transform,border-color] duration-150 hover:translate-x-0.5 hover:border-foreground/30 motion-reduce:transition-none motion-reduce:hover:translate-x-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {job.reference}
                      </span>
                      <JobStatusBadge status={job.status} />
                    </div>

                    <h2 className="mt-2 truncate font-display text-xl font-semibold text-foreground">
                      {job.vehicle.make} {job.vehicle.model}
                    </h2>

                    <p className="mt-1 text-base text-muted-foreground">
                      {job.client.fullName} |{" "}
                      {getSymptomCategory(job.symptomCategory)?.label ?? job.symptomCategory}
                    </p>

                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      {job.vehicle.registrationNo} | {formatDateTime(job.preferredDateTime)}
                      {Number.parseFloat(job.workLogTotal) > 0
                        ? ` | ${formatCurrency(job.workLogTotal)} logged`
                        : ""}
                    </p>
                  </div>

                  <ChevronRight
                    aria-hidden
                    className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

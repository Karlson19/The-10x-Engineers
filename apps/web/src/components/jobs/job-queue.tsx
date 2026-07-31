"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight, CircleAlert, ClipboardList } from "lucide-react";
import { type JobStatus, getSymptomCategory } from "@chrysmec/shared";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { VehicleSilhouette } from "@/components/vehicles/vehicle-silhouette";
import { useJobs } from "@/hooks/use-jobs";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

type StatusFilter = JobStatus | "OPEN" | "ALL";

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "OPEN", label: "Open" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ALL", label: "All" },
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
  // Opens on the work still to do. Finished jobs are a deliberate choice, not
  // the first thing a technician has to scroll past.
  const [status, setStatus] = useState<StatusFilter>("OPEN");
  const [when, setWhen] = useState<WhenFilter>("all");
  const prefersReducedMotion = useReducedMotion();

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
          <ul className="grid gap-3">
            {jobs.data.data.map((job, index) => {
              const due = new Date(job.preferredDateTime);
              const isOverdue = job.status !== "COMPLETED" && due.getTime() < Date.now();
              const logged = Number.parseFloat(job.workLogTotal);

              return (
                <motion.li
                  key={job.id}
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: motionTokens.base,
                    ease: motionTokens.easeOut,
                    delay: prefersReducedMotion ? 0 : Math.min(index, 8) * 0.04,
                  }}
                >
                  <Link
                    href={`/staff/jobs/${job.id}`}
                    className={cn(
                      "group flex items-center gap-4 rounded-xl border border-border bg-card p-4 sm:gap-5 sm:p-5",
                      "transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-foreground/25",
                      "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                    )}
                  >
                    <VehicleSilhouette
                      make={job.vehicle.make}
                      model={job.vehicle.model}
                      className="hidden w-24 shrink-0 self-center sm:block"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        {/*
                          A technician works to a clock, so when it is expected
                          leads, and anything already past its slot says so.
                        */}
                        <span
                          className={cn(
                            "font-mono text-sm",
                            isOverdue ? "font-medium text-destructive" : "text-foreground",
                          )}
                        >
                          {formatDateTime(job.preferredDateTime)}
                        </span>
                        {isOverdue ? (
                          <span className="flex items-center gap-1 font-mono text-xs tracking-[0.1em] text-destructive uppercase">
                            <CircleAlert aria-hidden size={13} />
                            Past its slot
                          </span>
                        ) : null}
                        <JobStatusBadge status={job.status} />
                      </div>

                      <h2 className="mt-2 truncate font-display text-xl font-semibold text-card-foreground">
                        {job.vehicle.make} {job.vehicle.model}
                      </h2>

                      <p className="mt-1 truncate text-base text-muted-foreground">
                        {job.client.fullName} |{" "}
                        {getSymptomCategory(job.symptomCategory)?.label ?? job.symptomCategory}
                      </p>

                      <p className="mt-2 flex flex-wrap gap-x-3 font-mono text-xs text-muted-foreground">
                        <span>{job.vehicle.registrationNo}</span>
                        <span>{job.reference}</span>
                        {logged > 0 ? (
                          <span className="text-foreground">
                            {formatCurrency(job.workLogTotal)} logged
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <ChevronRight
                      aria-hidden
                      className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

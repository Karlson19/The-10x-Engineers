"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, type RequestStatus } from "@chrysmec/shared";
import { AnimatePresence } from "motion/react";
import { RequestCard } from "@/components/requests/request-card";
import { PendingBookingCard } from "@/components/requests/pending-booking-card";
import { useOffline } from "@/components/providers/offline-provider";
import { useOutbox } from "@/hooks/use-outbox";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useServiceRequests } from "@/hooks/use-service-requests";
import { cn } from "@/lib/utils";

type Filter = RequestStatus | "ALL";

const FILTERS: readonly Filter[] = ["ALL", ...REQUEST_STATUSES];

function label(filter: Filter): string {
  return filter === "ALL" ? "All" : REQUEST_STATUS_LABELS[filter];
}

export function RequestList() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const requests = useServiceRequests(filter === "ALL" ? {} : { status: filter });
  const { refreshPending } = useOffline();
  const outbox = useOutbox();

  // Queued bookings have no status yet, so they only belong in the unfiltered
  // view and under Submitted.
  const pending =
    filter === "ALL" || filter === "SUBMITTED"
      ? outbox.filter((entry) => entry.status !== "synced" || Date.now() - entry.updatedAt < 6000)
      : [];

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="eyebrow">Your bookings</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">My requests</h1>

      {/* Horizontal scroll only on this filter row, never on the page. */}
      <div className="-mx-5 mt-8 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Filter by status" className="flex w-max gap-2 pb-1">
          {FILTERS.map((option) => {
            const isActive = option === filter;

            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(option)}
                className={cn(
                  "min-h-11 rounded-lg border px-4 text-sm whitespace-nowrap transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {label(option)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        {requests.isPending ? (
          <div className="space-y-4" aria-busy="true">
            <span className="sr-only">Loading your bookings</span>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : requests.isError ? (
          <ErrorState
            body="We could not load your bookings. Check your connection and try again."
            onRetry={() => void requests.refetch()}
            isRetrying={requests.isRefetching}
          />
        ) : requests.data.data.length === 0 && pending.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={filter === "ALL" ? "No bookings yet" : `Nothing ${label(filter).toLowerCase()}`}
            body={
              filter === "ALL"
                ? "Book a service and you will be able to follow every stage from here."
                : "Try a different filter, or book a service."
            }
            action={
              <Link href="/dashboard/book" className={buttonVariants({ variant: "accent" })}>
                Book a service
              </Link>
            }
          />
        ) : (
          <div>
            {/*
              Anything still on the device sits at the top, because it is the
              newest and because someone who just booked offline needs to see
              that it was not lost.
            */}
            <AnimatePresence initial={false}>
              {pending.map((entry) => (
                <PendingBookingCard
                  key={entry.clientRequestId}
                  entry={entry}
                  onChanged={() => void refreshPending()}
                />
              ))}
            </AnimatePresence>

            {requests.data.data.map((item) => (
              <RequestCard key={item.id} serviceRequest={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

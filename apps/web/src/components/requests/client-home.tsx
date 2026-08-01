"use client";

import Link from "next/link";
import { ArrowRight, Car, ClipboardList } from "lucide-react";
import { SECTION_LABELS, getSymptomCategory } from "@chrysmec/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { FirstRun } from "@/components/requests/first-run";
import { RequestCard } from "@/components/requests/request-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useServiceRequests } from "@/hooks/use-service-requests";
import { useVehicles } from "@/hooks/use-vehicles";
import { formatDateTime } from "@/lib/format";
import { StageDots } from "@/components/requests/stage-dots";
import { VehicleSilhouette } from "@/components/vehicles/vehicle-silhouette";
import { STATUS_META, statusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Everything that is not finished or called off, so still worth showing first. */
const OPEN_STATUSES: ReadonlySet<string> = new Set([
  "SUBMITTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "AWAITING_APPROVAL",
]);

export function ClientHome() {
  const { user } = useAuth();
  const requests = useServiceRequests({});
  const vehicles = useVehicles();

  const firstName = user?.fullName.split(" ")[0] ?? "there";

  const isReady = requests.isSuccess && vehicles.isSuccess;
  const hasVehicle = vehicles.data ? vehicles.data.data.length > 0 : false;
  const hasBooking = requests.data ? requests.data.data.length > 0 : false;

  /*
    A brand new account has nothing to show, and stacking two empty boxes and
    three buttons on it was worse than useless: it offered booking before there
    was a vehicle to book against. Until they have both, the screen is the
    guided path instead.
  */
  if (isReady && !hasBooking) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-14">
        <p className="eyebrow">Welcome, {firstName}</p>
        {/*
          Deliberately short. A three line headline pushed the one action on
          this screen below the tab bar on a normal phone, which is a poor way
          to greet somebody who has just signed up.
        */}
        <h1 className="mt-3 font-display text-3xl font-semibold text-balance text-foreground sm:text-4xl">
          Two steps to your first booking
        </h1>

        <FirstRun hasVehicle={hasVehicle} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="eyebrow">Your dashboard</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">
        Good to see you, {firstName}
      </h1>

      {/* Active work */}
      <section className="mt-10">
        <h2 className="border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
          Happening now
        </h2>

        {requests.isPending ? (
          <div className="mt-5 space-y-3" aria-busy="true">
            <span className="sr-only">Loading your bookings</span>
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : requests.isError ? (
          <ErrorState
            className="mt-5"
            body="We could not load your bookings. Check your connection and try again."
            onRetry={() => void requests.refetch()}
            isRetrying={requests.isRefetching}
          />
        ) : (
          (() => {
            const open = requests.data.data.filter((item) => OPEN_STATUSES.has(item.status));
            const active = open[0];

            if (!active) {
              return (
                <EmptyState
                  className="mt-5"
                  icon={ClipboardList}
                  title="Nothing booked in"
                  body="When you book a service it will show here, with every stage from received to ready."
                  action={
                    <Link href="/dashboard/book" className={buttonVariants({ variant: "accent" })}>
                      Book a service
                      <ArrowRight aria-hidden size={18} />
                    </Link>
                  }
                />
              );
            }

            const meta = STATUS_META[active.status];
            const category = getSymptomCategory(active.symptomCategory);

            return (
              <div className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
                  <VehicleSilhouette
                    make={active.vehicle.make}
                    model={active.vehicle.model}
                    className="w-40 self-center sm:w-48 sm:shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {active.reference}
                      </span>
                      <Badge tone={statusTone(active.status)} icon={meta.icon}>
                        {meta.customerLabel}
                      </Badge>
                    </div>

                    <h3 className="mt-3 font-display text-2xl font-semibold text-card-foreground">
                      {active.vehicle.make} {active.vehicle.model}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {active.vehicle.registrationNo}
                    </p>

                    <StageDots status={active.status} className="mt-4" />

                    <p className="mt-4 text-base text-muted-foreground">{meta.description}</p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-border pt-4 sm:grid-cols-2">
                  <div>
                    <dt className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
                      Booked for
                    </dt>
                    <dd className="mt-1 text-base">{formatDateTime(active.preferredDateTime)}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
                      Work
                    </dt>
                    <dd className="mt-1 text-base">
                      {SECTION_LABELS[active.section]}
                      {category ? `, ${category.label.toLowerCase()}` : ""}
                    </dd>
                  </div>
                </dl>

                {/* When the booking is waiting on the customer, say so here
                    rather than making them find it on the detail page. */}
                <Link
                  href={`/dashboard/requests/${active.id}`}
                  className={cn(buttonVariants({ variant: "accent" }), "mt-6")}
                >
                  {active.status === "AWAITING_APPROVAL"
                    ? "Answer the estimate"
                    : "See the full timeline"}
                  <ArrowRight aria-hidden size={18} />
                </Link>

                {open.length > 1 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    You have {open.length - 1} other booking{open.length - 1 === 1 ? "" : "s"} in
                    progress.{" "}
                    <Link
                      href="/dashboard/requests"
                      className="text-foreground underline decoration-accent decoration-2 underline-offset-4"
                    >
                      See all
                    </Link>
                  </p>
                ) : null}
              </div>
            );
          })()
        )}
      </section>

      {/* Vehicles */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-foreground/85 pb-3">
          <h2 className="font-display text-xl font-semibold text-foreground">Your vehicles</h2>
          <Link
            href="/dashboard/vehicles"
            className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground"
          >
            Manage
          </Link>
        </div>

        {vehicles.isPending ? (
          <div className="mt-4 space-y-2" aria-busy="true">
            <span className="sr-only">Loading your vehicles</span>
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : vehicles.isError ? (
          <ErrorState
            className="mt-4"
            body="We could not load your vehicles."
            onRetry={() => void vehicles.refetch()}
            isRetrying={vehicles.isRefetching}
          />
        ) : vehicles.data.data.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Car}
            title="No vehicles yet"
            body="Add a vehicle and you can book a service in under a minute."
            action={
              <Link href="/dashboard/vehicles" className={buttonVariants({ variant: "outline" })}>
                Add a vehicle
              </Link>
            }
          />
        ) : (
          <ul className="mt-1">
            {vehicles.data.data.slice(0, 3).map((vehicle) => (
              <li
                key={vehicle.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3.5"
              >
                <span className="text-base text-foreground">
                  {vehicle.make} {vehicle.model}
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  {vehicle.registrationNo}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* History */}
      {!requests.isPending && !requests.isError && requests.data.data.length > 0 ? (
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-foreground/85 pb-3">
            <h2 className="font-display text-xl font-semibold text-foreground">Recent history</h2>
            <Link
              href="/dashboard/requests"
              className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground"
            >
              See all
            </Link>
          </div>
          <div>
            {requests.data.data.slice(0, 4).map((item) => (
              <RequestCard key={item.id} serviceRequest={item} />
            ))}
          </div>
        </section>
      ) : null}

    </div>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchServiceRequests } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { Docket } from "@/components/patterns/docket";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { usePendingCount } from "@/lib/use-outbox";

function DocketSkeleton() {
  return <div className="h-28 animate-pulse rounded-card border border-paper-line bg-paper-dim/60" />;
}

export default function ClientDashboard() {
  const user = useAuth((s) => s.user);
  const pending = usePendingCount();

  const { data, isLoading } = useQuery({
    queryKey: ["client", "requests", user?.id],
    queryFn: () => fetchServiceRequests({ role: "CLIENT", userId: user!.id }),
    enabled: !!user,
  });

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="label-eyebrow">Welcome back</div>
          <h1 className="mt-1 font-display text-2xl">{user?.fullName}</h1>
        </div>
        <Link href="/requests/new">
          <Button tone="client">New request</Button>
        </Link>
      </div>

      {pending > 0 && (
        <Link
          href="/requests/outbox"
          className="mb-4 flex items-center justify-between rounded-card border border-staff/30 bg-staff-soft/50 px-4 py-3 text-sm text-staff-ink"
        >
          <span>
            {pending} request{pending > 1 ? "s" : ""} saved on this device, waiting to send.
          </span>
          <span className="font-semibold">View outbox →</span>
        </Link>
      )}

      <div className="space-y-3">
        {isLoading && (
          <>
            <DocketSkeleton />
            <DocketSkeleton />
          </>
        )}

        {!isLoading && data?.length === 0 && (
          <EmptyState
            title="No requests yet"
            body="When your car needs attention, describe the symptoms and we'll dispatch a technician to you."
            action={
              <Link href="/requests/new">
                <Button tone="client">Book your first request</Button>
              </Link>
            }
          />
        )}

        {data?.map((r) => (
          <Docket key={r.id} request={r} href={`/requests/${r.id}`} />
        ))}
      </div>
    </div>
  );
}

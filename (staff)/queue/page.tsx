"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchServiceRequests } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { Docket } from "@/components/patterns/docket";
import { EmptyState } from "@/components/ui/primitives";

export default function QueuePage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["staff", "requests", user?.section],
    queryFn: () => fetchServiceRequests({ role: "STAFF", userId: user!.id, section: user!.section }),
    enabled: !!user,
  });

  return (
    <div>
      <div className="label-eyebrow">Your section</div>
      <h1 className="mt-1 font-display text-2xl">{user?.section} job queue</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Requests routed to your section, most recent first. Open one to respond and log work.
      </p>

      <div className="mt-6 space-y-3">
        {isLoading && <div className="h-28 animate-pulse rounded-card bg-paper-dim/60" />}
        {!isLoading && data?.length === 0 && (
          <EmptyState title="Queue is clear" body="No requests are currently routed to your section." />
        )}
        {data?.map((r) => (
          <Docket key={r.id} request={r} href={`/jobs/${r.id}`} sectionLabel={user?.section ?? undefined} />
        ))}
      </div>
    </div>
  );
}

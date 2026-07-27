"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAnalytics, fetchServiceRequests } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { StatCard } from "@/components/ui/primitives";
import { Docket } from "@/components/patterns/docket";
import { formatGHS } from "@/lib/utils";

export default function OverviewPage() {
  const user = useAuth((s) => s.user);
  const { data: requests } = useQuery({
    queryKey: ["mgmt", "requests"],
    queryFn: () => fetchServiceRequests({ role: "MANAGEMENT", userId: user!.id }),
    enabled: !!user,
  });
  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  const open = requests?.filter((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED") ?? [];
  const mechanical = requests?.filter((r) => r.section === "MECHANICAL").length ?? 0;
  const electrical = requests?.filter((r) => r.section === "ELECTRICAL").length ?? 0;

  return (
    <div>
      <div className="label-eyebrow">Full activity overview</div>
      <h1 className="mt-1 font-display text-2xl">Everything, in one place</h1>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open requests" value={String(open.length)} sub={`${mechanical} mechanical · ${electrical} electrical`} />
        <StatCard label="Bookings (month)" value={String(analytics?.bookings ?? "—")} toneClass="text-mgmt" />
        <StatCard label="Revenue (month)" value={analytics ? formatGHS(analytics.revenue) : "—"} toneClass="text-success" />
        <StatCard
          label="Conversion"
          value={analytics ? `${Math.round(analytics.conversionRate * 100)}%` : "—"}
          sub={`${analytics?.contacts ?? "—"} contacts`}
        />
      </div>

      <h2 className="mt-8 font-display text-lg">Needs attention</h2>
      <div className="mt-3 space-y-3">
        {open.slice(0, 5).map((r) => (
          <Docket key={r.id} request={r} href={`/requests?focus=${r.id}`} />
        ))}
        {open.length === 0 && (
          <p className="text-sm text-ink-faint">Nothing outstanding — every request is completed or cancelled.</p>
        )}
      </div>
    </div>
  );
}

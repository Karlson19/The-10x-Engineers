"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchServiceRequests } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { Docket } from "@/components/patterns/docket";
import { Select } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/primitives";
import type { RequestStatus, Section } from "@/lib/types";

const STATUSES: RequestStatus[] = ["SUBMITTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const SECTIONS: Section[] = ["MECHANICAL", "ELECTRICAL"];

export default function ManagementRequestsPage() {
  const user = useAuth((s) => s.user);
  const [status, setStatus] = useState<string>("ALL");
  const [section, setSection] = useState<string>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["mgmt", "requests"],
    queryFn: () => fetchServiceRequests({ role: "MANAGEMENT", userId: user!.id }),
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter(
      (r) => (status === "ALL" || r.status === status) && (section === "ALL" || r.section === section)
    );
  }, [data, status, section]);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="label-eyebrow">Every section, every client</div>
          <h1 className="mt-1 font-display text-2xl">All requests</h1>
        </div>
        <div className="flex gap-2">
          <Select value={section} onChange={(e) => setSection(e.target.value)} className="w-40">
            <option value="ALL">All sections</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && <div className="h-28 animate-pulse rounded-card bg-paper-dim/60" />}
        {!isLoading && filtered.length === 0 && (
          <EmptyState title="No matching requests" body="Try clearing a filter." />
        )}
        {filtered.map((r) => (
          <Docket key={r.id} request={r} href={`/requests/${r.id}`} />
        ))}
      </div>
    </div>
  );
}

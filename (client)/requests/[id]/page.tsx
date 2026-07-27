"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { fetchServiceRequest, updateRequestStatus } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { Card, Select } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/patterns/status-badge";
import { STATUS_LABEL, formatDateTime, symptomLabel, cn } from "@/lib/utils";
import type { RequestStatus } from "@/lib/types";

const TIMELINE: RequestStatus[] = ["SUBMITTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"];

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();

  const { data: request, isLoading } = useQuery({
    queryKey: ["request", params.id],
    queryFn: () => fetchServiceRequest(params.id),
  });

  if (isLoading || !request) {
    return <div className="h-40 animate-pulse rounded-card bg-paper-dim/60" />;
  }

  const currentIdx = TIMELINE.indexOf(request.status);
  const cancelled = request.status === "CANCELLED";

  async function setStatus(status: RequestStatus) {
    await updateRequestStatus(request!.id, status);
    qc.invalidateQueries({ queryKey: ["request", params.id] });
    qc.invalidateQueries({ queryKey: ["mgmt", "requests"] });
  }

  return (
    <div className="max-w-xl">
      <div className="font-mono text-xs uppercase tracking-wider text-ink-faint">#{request.id}</div>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="font-display text-2xl">
          {request.vehicle.make} {request.vehicle.model}
        </h1>
        <StatusBadge status={request.status} />
      </div>
      <p className="font-mono text-xs text-ink-faint">{request.vehicle.registrationNo}</p>

      {!cancelled && (
        <Card className="mt-5 p-5">
          <div className="flex items-center">
            {TIMELINE.map((s, i) => (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      i <= currentIdx ? "bg-client text-white" : "bg-paper-dim text-ink-faint"
                    )}
                  >
                    {i < currentIdx ? <Check size={13} /> : i + 1}
                  </div>
                  <span className="mt-1.5 text-center text-[10px] leading-tight text-ink-faint">
                    {STATUS_LABEL[s]}
                  </span>
                </div>
                {i < TIMELINE.length - 1 && (
                  <div className={cn("mx-1 h-0.5 flex-1", i < currentIdx ? "bg-client" : "bg-paper-dim")} />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <div className="label-eyebrow">Reported issue</div>
        <p className="mt-1.5 text-sm text-ink">
          <span className="font-semibold">{symptomLabel(request.symptomCategory)}</span> ·{" "}
          {request.symptomDetails.when}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{request.symptomDetails.description}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-faint">
          <div>Requested for {formatDateTime(request.preferredDateTime)}</div>
          <div>{request.locationText}</div>
          {user?.role === "MANAGEMENT" && <div>{request.clientName}</div>}
          <div>{request.section}</div>
        </div>
      </Card>

      {user?.role === "MANAGEMENT" && (
        <Card className="mt-4 p-5">
          <div className="label-eyebrow">Management controls</div>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm text-ink-soft">Advance status</span>
            <Select
              value={request.status}
              onChange={(e) => setStatus(e.target.value as RequestStatus)}
              className="w-48"
            >
              {(["SUBMITTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as RequestStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                )
              )}
            </Select>
          </div>
        </Card>
      )}
    </div>
  );
}

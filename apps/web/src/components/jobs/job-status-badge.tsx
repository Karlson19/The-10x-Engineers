import { CircleCheck, CircleDot, Wrench } from "lucide-react";
import type { JobStatus } from "@chrysmec/shared";
import { Badge } from "@/components/ui/badge";

const JOB_STATUS_META = {
  ASSIGNED: { label: "Assigned", icon: CircleDot, tone: "neutral" },
  IN_PROGRESS: { label: "In progress", icon: Wrench, tone: "current" },
  COMPLETED: { label: "Completed", icon: CircleCheck, tone: "done" },
} as const;

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const meta = JOB_STATUS_META[status];

  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

export { JOB_STATUS_META };

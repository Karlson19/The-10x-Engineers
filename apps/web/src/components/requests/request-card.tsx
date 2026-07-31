import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  type ServiceRequest,
  SECTION_LABELS,
  getSymptomCategory,
} from "@chrysmec/shared";
import { Badge } from "@/components/ui/badge";
import { STATUS_META, statusTone } from "@/lib/status";
import { formatDateTime } from "@/lib/format";

export function RequestCard({ serviceRequest }: { serviceRequest: ServiceRequest }) {
  const meta = STATUS_META[serviceRequest.status];
  const category = getSymptomCategory(serviceRequest.symptomCategory);

  return (
    <Link
      href={`/dashboard/requests/${serviceRequest.id}`}
      className="group flex items-center gap-4 border-b border-border py-5 transition-[transform,border-color] duration-150 hover:translate-x-0.5 hover:border-foreground/30 motion-reduce:transition-none motion-reduce:hover:translate-x-0"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-sm text-muted-foreground">{serviceRequest.reference}</span>
          <Badge tone={statusTone(serviceRequest.status)} icon={meta.icon}>
            {meta.customerLabel}
          </Badge>
        </div>

        <h3 className="mt-2 truncate font-display text-xl font-semibold text-foreground">
          {serviceRequest.vehicle.make} {serviceRequest.vehicle.model}
        </h3>

        <p className="mt-1 text-base text-muted-foreground">
          {SECTION_LABELS[serviceRequest.section]}
          {category ? `, ${category.label.toLowerCase()}` : ""}
        </p>

        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {serviceRequest.vehicle.registrationNo} | {formatDateTime(serviceRequest.preferredDateTime)}
        </p>
      </div>

      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}

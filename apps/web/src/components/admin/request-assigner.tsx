"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { SECTION_LABELS, type ServiceRequest } from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useTechnicians } from "@/hooks/use-analytics";
import { useCreateJob } from "@/hooks/use-jobs";
import { ApiError } from "@/lib/api/client";

/**
 * Assigning is the one action that turns a booking into work. Only technicians
 * from the matching section are offered, and the server checks that again.
 */
export function RequestAssigner({ serviceRequest }: { serviceRequest: ServiceRequest }) {
  const technicians = useTechnicians();
  const createJob = useCreateJob();
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const eligible = (technicians.data?.data ?? []).filter(
    (person) => person.section === serviceRequest.section,
  );

  if (serviceRequest.job) {
    return (
      <p className="text-sm text-muted-foreground">
        Assigned to {serviceRequest.job.assignedStaff.fullName}
      </p>
    );
  }

  if (serviceRequest.status === "COMPLETED" || serviceRequest.status === "CANCELLED") {
    return <p className="text-sm text-muted-foreground">Closed</p>;
  }

  return (
    <div className="w-full sm:w-auto">
      {error ? (
        <Alert tone="error" title="Could not assign" className="mb-3">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <FormField
          id={`assign-${serviceRequest.id}`}
          // "an electrical technician", not "a electrical technician".
          label={`Assign ${serviceRequest.section === "ELECTRICAL" ? "an" : "a"} ${SECTION_LABELS[
            serviceRequest.section
          ].toLowerCase()} technician`}
          className="sm:w-64"
        >
          {(field) => (
            <Select
              {...field}
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              disabled={technicians.isPending || eligible.length === 0}
            >
              <option value="">
                {eligible.length === 0 ? "Nobody available" : "Choose a technician"}
              </option>
              {eligible.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <Button
          variant="accent"
          className="sm:mb-6"
          disabled={staffId.length === 0}
          isPending={createJob.isPending}
          pendingLabel="Assigning"
          onClick={async () => {
            setError(null);
            try {
              await createJob.mutateAsync({
                serviceRequestId: serviceRequest.id,
                assignedStaffId: staffId,
                scheduleRequest: true,
              });
            } catch (caught) {
              setError(
                caught instanceof ApiError
                  ? caught.message
                  : "Could not assign this booking. Check your connection and try again.",
              );
            }
          }}
        >
          <UserPlus aria-hidden size={18} />
          Assign
        </Button>
      </div>
    </div>
  );
}

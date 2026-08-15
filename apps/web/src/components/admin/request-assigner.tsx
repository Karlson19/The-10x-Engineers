"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { SECTION_LABELS, type ServiceRequest } from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useTechnicians } from "@/hooks/use-analytics";
import { useCreateJob, useJobs } from "@/hooks/use-jobs";
import { ApiError } from "@/lib/api/client";

/**
 * Assigning is the one action that turns a booking into work. Only technicians
 * from the matching section are offered, and the server checks that again.
 */
export function RequestAssigner({ serviceRequest }: { serviceRequest: ServiceRequest }) {
  const technicians = useTechnicians();
  // Every job still on the floor, so the picker can say who is already loaded.
  const openJobs = useJobs({ status: "OPEN" });
  const createJob = useCreateJob();
  const { showToast } = useToast();
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);

  /*
    Who is free, least busy first.

    Assigning used to be a plain list of names, which meant picking somebody
    without knowing whether they already had five cars in front of them. The
    open count is the whole basis for choosing well, so it is on the option
    itself, and the order puts the sensible answer at the top.
  */
  const eligible = (technicians.data?.data ?? [])
    .filter((person) => person.section === serviceRequest.section)
    .map((person) => ({
      ...person,
      openJobs: (openJobs.data?.data ?? []).filter((job) => job.assignedStaff.id === person.id)
        .length,
    }))
    .sort((a, b) => a.openJobs - b.openJobs);

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
                  {openJobs.isPending
                    ? ""
                    : person.openJobs === 0
                      ? " (free)"
                      : ` (${person.openJobs} open)`}
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
              const person = eligible.find((candidate) => candidate.id === staffId);
              showToast({
                tone: "success",
                title: "Assigned and scheduled",
                body: `${serviceRequest.reference} is with ${person?.fullName ?? "the technician"}, and the customer has been told.`,
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

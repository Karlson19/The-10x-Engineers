"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Wrench, PackagePlus } from "lucide-react";
import {
  addWorkLogEntry,
  fetchInventory,
  fetchJobByRequestId,
  fetchServiceRequest,
  respondToRequest,
  updateJob,
} from "@/lib/api";
import { useAuth } from "@/lib/store";
import { worklogSchema, type WorklogForm } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/patterns/status-badge";
import { formatDateTime, formatGHS, symptomLabel } from "@/lib/utils";

export default function StaffJobDetail() {
  const params = useParams<{ id: string }>();
  const requestId = params.id;
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: request } = useQuery({
    queryKey: ["request", requestId],
    queryFn: () => fetchServiceRequest(requestId),
  });
  const { data: job, refetch: refetchJob } = useQuery({
    queryKey: ["job-by-request", requestId],
    queryFn: () => fetchJobByRequestId(requestId),
  });
  const { data: inventory } = useQuery({
    queryKey: ["inventory", user?.section],
    queryFn: () => fetchInventory(user?.section ?? undefined),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WorklogForm>({
    resolver: zodResolver(worklogSchema),
    defaultValues: { lineType: "PART", quantity: 1, unitCost: 0 },
  });
  const lineType = watch("lineType");

  async function respond() {
    if (!user) return;
    await respondToRequest(requestId, user.id, user.fullName);
    qc.invalidateQueries({ queryKey: ["request", requestId] });
    refetchJob();
  }

  async function onAddLine(values: WorklogForm) {
    if (!job) return;
    await addWorkLogEntry(job.id, values);
    reset({ lineType: "PART", description: "", quantity: 1, unitCost: 0 });
    setShowForm(false);
    refetchJob();
  }

  if (!request) return <div className="h-40 animate-pulse rounded-card bg-paper-dim/60" />;

  const total = job?.workLog.reduce((sum, l) => sum + l.quantity * l.unitCost, 0) ?? 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-1 font-mono text-xs uppercase tracking-wider text-ink-faint">
        #{request.id}
      </div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">
          {request.vehicle.make} {request.vehicle.model}
        </h1>
        <StatusBadge status={request.status} />
      </div>
      <p className="mt-1 font-mono text-xs text-ink-faint">{request.vehicle.registrationNo}</p>

      <Card className="mt-5 p-5">
        <div className="label-eyebrow">Customer report</div>
        <p className="mt-1.5 text-sm text-ink">
          <span className="font-semibold">{symptomLabel(request.symptomCategory)}</span> ·{" "}
          {request.symptomDetails.when}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{request.symptomDetails.description}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-ink-faint">
          <div>Requested for {formatDateTime(request.preferredDateTime)}</div>
          <div>{request.locationText}</div>
          <div>{request.clientName}</div>
        </div>
      </Card>

      {!job ? (
        <Card className="mt-4 flex items-center justify-between p-5">
          <div>
            <div className="font-semibold text-ink">Not yet assigned</div>
            <div className="text-sm text-ink-soft">Respond to take this job.</div>
          </div>
          <Button tone="staff" onClick={respond}>
            <Wrench size={15} /> Respond
          </Button>
        </Card>
      ) : (
        <>
          <Card className="mt-4 p-5">
            <div className="flex items-center justify-between">
              <div className="label-eyebrow">Assigned to</div>
              <span className="text-xs text-ink-faint">Job {job.id}</span>
            </div>
            <div className="mt-1 font-medium text-ink">{job.assignedStaffName}</div>
            {job.diagnosisNotes && (
              <p className="mt-2 text-sm text-ink-soft">{job.diagnosisNotes}</p>
            )}
          </Card>

          <div className="mt-5 flex items-center justify-between">
            <h2 className="font-display text-lg">Work log</h2>
            <Button variant="secondary" onClick={() => setShowForm((s) => !s)}>
              <Plus size={15} /> Add line
            </Button>
          </div>

          {showForm && (
            <Card className="mt-3 p-4">
              <form onSubmit={handleSubmit(onAddLine)} className="space-y-3">
                <div className="flex gap-3">
                  {(["PART", "LABOUR"] as const).map((t) => (
                    <label
                      key={t}
                      className={`flex-1 cursor-pointer rounded-md border-2 px-3 py-2 text-center text-sm font-medium ${
                        lineType === t ? "border-staff bg-staff-soft text-staff-ink" : "border-paper-line text-ink-soft"
                      }`}
                    >
                      <input type="radio" value={t} {...register("lineType")} className="sr-only" />
                      {t === "PART" ? <PackagePlus size={14} className="mr-1 inline" /> : null}
                      {t === "PART" ? "Part" : "Labour"}
                    </label>
                  ))}
                </div>

                {lineType === "PART" ? (
                  <Field label="Part" error={errors.description?.message}>
                    <Select {...register("description")}>
                      <option value="">Select from stock</option>
                      {inventory?.map((i) => (
                        <option key={i.id} value={i.name}>
                          {i.name} ({i.quantityInStock} in stock)
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <Field label="Description" error={errors.description?.message}>
                    <Input {...register("description")} placeholder="e.g. Diagnostic labour" />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantity" error={errors.quantity?.message}>
                    <Input type="number" step="1" min={1} {...register("quantity")} />
                  </Field>
                  <Field label="Unit cost (GHS)" error={errors.unitCost?.message}>
                    <Input type="number" step="0.01" min={0} {...register("unitCost")} />
                  </Field>
                </div>

                <Button type="submit" tone="staff" fullWidth disabled={isSubmitting}>
                  Save line item
                </Button>
              </form>
            </Card>
          )}

          <Card className="mt-3 overflow-hidden">
            {job.workLog.length === 0 ? (
              <div className="p-5 text-center text-sm text-ink-faint">
                No parts or labour logged yet — even small items count.
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {job.workLog.map((l) => (
                    <tr key={l.id} className="border-b border-paper-line last:border-0">
                      <td className="p-3">
                        <span className="stamp mr-2 rounded-full bg-paper-dim px-2 py-0.5 text-[10px] text-ink-soft">
                          {l.lineType}
                        </span>
                        {l.description}
                      </td>
                      <td className="p-3 text-right text-ink-faint">×{l.quantity}</td>
                      <td className="p-3 text-right font-mono">{formatGHS(l.quantity * l.unitCost)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-3 font-semibold" colSpan={2}>
                      Total
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">{formatGHS(total)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

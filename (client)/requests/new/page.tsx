"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Zap, Wrench } from "lucide-react";
import { fetchVehicles } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { newServiceRequestSchema, type NewServiceRequestForm } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { NetworkToggle } from "@/components/patterns/network-toggle";
import { queueServiceRequest, useOutboxFlusher } from "@/lib/use-outbox";
import { isOnline, useNetwork } from "@/lib/network";
import { cn } from "@/lib/utils";
import type { NewServiceRequestInput } from "@/lib/types";

const SYMPTOMS: { value: NewServiceRequestForm["symptomCategory"]; label: string }[] = [
  { value: "STARTING_ISSUE", label: "Won't start / starting trouble" },
  { value: "BRAKES", label: "Brakes" },
  { value: "ENGINE_NOISE", label: "Unusual engine noise" },
  { value: "ELECTRICAL_FAULT", label: "Electrical fault (lights, dashboard, etc.)" },
  { value: "OVERHEATING", label: "Overheating" },
  { value: "OTHER", label: "Something else" },
];

const STEPS = ["Vehicle", "What's wrong", "Schedule", "Review"];

export default function NewRequestPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const flush = useOutboxFlusher();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState<{ offline: boolean } | null>(null);

  const { data: vehicles } = useQuery({
    queryKey: ["client", "vehicles", user?.id],
    queryFn: () => fetchVehicles(user!.id),
    enabled: !!user,
  });

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<NewServiceRequestForm>({
    resolver: zodResolver(newServiceRequestSchema),
    defaultValues: { when: "intermittent" },
  });

  const values = watch();

  async function goNext() {
    const fieldsByStep: (keyof NewServiceRequestForm)[][] = [
      ["vehicleId", "section"],
      ["symptomCategory", "when", "description"],
      ["preferredDate", "preferredTime", "locationText"],
    ];
    const ok = await trigger(fieldsByStep[step]);
    if (ok) setStep((s) => s + 1);
  }

  async function onSubmit(form: NewServiceRequestForm) {
    if (!user) return;
    const vehicle = vehicles?.find((v) => v.id === form.vehicleId);

    const input: NewServiceRequestInput = {
      vehicleId: form.vehicleId,
      vehicleLabel: vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle",
      section: form.section,
      preferredDateTime: new Date(`${form.preferredDate}T${form.preferredTime}:00`).toISOString(),
      locationText: form.locationText,
      symptomCategory: form.symptomCategory,
      symptomDetails: { when: form.when, description: form.description },
      clientRequestId: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };

    // Always write to the outbox first (ADR-005) -- online or not.
    await queueServiceRequest(input);
    setSubmitted({ offline: !isOnline(useNetwork.getState()) });
    // Attempt an immediate flush; a no-op if offline.
    flush();
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            submitted.offline ? "bg-staff-soft text-staff-ink" : "bg-success-soft text-success"
          )}
        >
          <CheckCircle2 size={28} />
        </div>
        <h1 className="mt-4 font-display text-2xl">
          {submitted.offline ? "Saved on this device" : "Request submitted"}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-ink-soft">
          {submitted.offline
            ? "You're offline right now, so this was saved to your device's outbox. It will send automatically the moment you're back online."
            : "A technician will be dispatched and you'll see status updates on your dashboard."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button tone="client" onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
          {submitted.offline && (
            <Button variant="secondary" onClick={() => router.push("/requests/outbox")}>
              View outbox
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="label-eyebrow">New service request</div>
          <h1 className="mt-1 font-display text-2xl">{STEPS[step]}</h1>
        </div>
        <NetworkToggle />
      </div>

      {/* step progress */}
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-client" : "bg-paper-line")}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="p-5">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Which vehicle?" error={errors.vehicleId?.message}>
                <Select {...register("vehicleId")}>
                  <option value="">Select a vehicle</option>
                  {vehicles?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} · {v.registrationNo}
                    </option>
                  ))}
                </Select>
              </Field>

              <div>
                <span className="mb-1.5 block text-sm font-semibold text-ink">Section</span>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: "MECHANICAL", label: "Mechanical", icon: Wrench },
                      { value: "ELECTRICAL", label: "Electrical", icon: Zap },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 p-4 text-sm font-medium",
                        values.section === opt.value
                          ? "border-client bg-client-soft text-client-ink"
                          : "border-paper-line text-ink-soft"
                      )}
                    >
                      <input type="radio" value={opt.value} {...register("section")} className="sr-only" />
                      <opt.icon size={18} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {errors.section && <p className="mt-1 text-xs text-rust">{errors.section.message}</p>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Field label="What system seems affected?" error={errors.symptomCategory?.message}>
                <Select {...register("symptomCategory")}>
                  <option value="">Choose one</option>
                  {SYMPTOMS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <div>
                <span className="mb-1.5 block text-sm font-semibold text-ink">
                  Does it happen constantly, or on and off?
                </span>
                <div className="flex gap-3">
                  {(["constant", "intermittent"] as const).map((w) => (
                    <label
                      key={w}
                      className={cn(
                        "flex-1 cursor-pointer rounded-md border-2 px-4 py-2.5 text-center text-sm font-medium capitalize",
                        values.when === w
                          ? "border-client bg-client-soft text-client-ink"
                          : "border-paper-line text-ink-soft"
                      )}
                    >
                      <input type="radio" value={w} {...register("when")} className="sr-only" />
                      {w}
                    </label>
                  ))}
                </div>
              </div>

              <Field
                label="Describe exactly what happens"
                hint='e.g. "ignition cuts out repeatedly before failing" rather than "the car stopped"'
                error={errors.description?.message}
              >
                <Textarea {...register("description")} placeholder="What happens, and when?" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preferred date" error={errors.preferredDate?.message}>
                  <Input type="date" {...register("preferredDate")} />
                </Field>
                <Field label="Preferred time" error={errors.preferredTime?.message}>
                  <Input type="time" {...register("preferredTime")} />
                </Field>
              </div>
              <Field
                label="Where is the vehicle?"
                hint="A landmark works well, e.g. 'KNUST Main Gate'"
                error={errors.locationText?.message}
              >
                <Input {...register("locationText")} placeholder="Location" />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <SummaryRow label="Vehicle" value={vehicles?.find((v) => v.id === values.vehicleId)?.make + " " + (vehicles?.find((v) => v.id === values.vehicleId)?.model ?? "")} />
              <SummaryRow label="Section" value={values.section} />
              <SummaryRow label="Symptom" value={SYMPTOMS.find((s) => s.value === values.symptomCategory)?.label ?? ""} />
              <SummaryRow label="Pattern" value={values.when} />
              <SummaryRow label="Details" value={values.description} />
              <SummaryRow label="When" value={`${values.preferredDate} ${values.preferredTime}`} />
              <SummaryRow label="Location" value={values.locationText} />
            </div>
          )}
        </Card>

        <div className="mt-5 flex justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={step === 0 ? "invisible" : ""}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" tone="client" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="submit" tone="client">
              Submit request
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-paper-line py-2">
      <span className="text-ink-faint">{label}</span>
      <span className="text-right font-medium text-ink">{value || "—"}</span>
    </div>
  );
}

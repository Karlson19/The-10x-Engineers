"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateVehicleRequest,
  type Vehicle,
  createVehicleRequestSchema,
} from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { useCreateVehicle, useUpdateVehicle } from "@/hooks/use-vehicles";

type VehicleFormProps = {
  vehicle?: Vehicle;
  onDone: (vehicle: Vehicle) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function VehicleForm({ vehicle, onDone, onCancel, submitLabel }: VehicleFormProps) {
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateVehicleRequest>({
    resolver: zodResolver(createVehicleRequestSchema),
    defaultValues: vehicle
      ? {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          registrationNo: vehicle.registrationNo,
          notes: vehicle.notes ?? "",
        }
      : { make: "", model: "", year: new Date().getFullYear(), registrationNo: "", notes: "" },
  });

  async function onSubmit(values: CreateVehicleRequest): Promise<void> {
    setFormError(null);

    try {
      const saved = vehicle
        ? await updateMutation.mutateAsync({ id: vehicle.id, input: values })
        : await createMutation.mutateAsync(values);
      onDone(saved);
    } catch (error) {
      if (error instanceof ApiError && error.details.registrationNo) {
        setError("registrationNo", { message: error.details.registrationNo });
        return;
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not save the vehicle. Check your connection and try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError ? (
        <Alert tone="error" title="Could not save">
          {formError}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="make" label="Make" error={errors.make?.message}>
          {(field) => <Input {...field} {...register("make")} placeholder="Toyota" />}
        </FormField>

        <FormField id="model" label="Model" error={errors.model?.message}>
          {(field) => <Input {...field} {...register("model")} placeholder="Corolla" />}
        </FormField>

        <FormField id="year" label="Year" error={errors.year?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("year", { valueAsNumber: true })}
              type="number"
              inputMode="numeric"
              placeholder="2018"
            />
          )}
        </FormField>

        <FormField
          id="registrationNo"
          label="Registration number"
          error={errors.registrationNo?.message}
        >
          {(field) => (
            <Input
              {...field}
              {...register("registrationNo")}
              placeholder="AS 1234-22"
              className="font-mono uppercase"
            />
          )}
        </FormField>
      </div>

      <FormField
        id="notes"
        label="Notes"
        hint="Optional. Anything a technician should know before they start."
        error={errors.notes?.message}
      >
        {(field) => (
          <Textarea {...field} {...register("notes")} placeholder="Takes 5W-30. Aftermarket alarm fitted." />
        )}
      </FormField>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="accent" isPending={isSubmitting} pendingLabel="Saving">
          {submitLabel ?? (vehicle ? "Save changes" : "Add vehicle")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

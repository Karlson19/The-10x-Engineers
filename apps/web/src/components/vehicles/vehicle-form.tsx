"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateVehicleRequest,
  type Vehicle,
  createVehicleRequestSchema,
} from "@chrysmec/shared";
import { BrandMark } from "@/components/vehicles/brand-mark";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { useCreateVehicle, useUpdateVehicle } from "@/hooks/use-vehicles";
import { VEHICLE_MAKES, modelsForMake, vehicleYears } from "@/lib/vehicle-catalogue";

type VehicleFormProps = {
  vehicle?: Vehicle;
  onDone: (vehicle: Vehicle) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

const YEARS = vehicleYears();

const MAKE_OPTIONS: readonly ComboboxOption[] = VEHICLE_MAKES.map((make) => ({
  value: make.name,
  label: make.name,
  hint: `${make.models.length} models`,
}));

export function VehicleForm({ vehicle, onDone, onCancel, submitLabel }: VehicleFormProps) {
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
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

  // The model list follows whatever make is chosen, including one typed by hand.
  const make = useWatch({ control, name: "make" });

  const modelOptions: readonly ComboboxOption[] = useMemo(
    () => modelsForMake(make ?? "").map((model) => ({ value: model, label: model })),
    [make],
  );

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

      <FormField
        id="make"
        label="Make"
        hint="Start typing. If yours is not listed, type it in anyway."
        error={errors.make?.message}
      >
        {(field) => (
          <Controller
            control={control}
            name="make"
            render={({ field: controlled }) => (
              <Combobox
                {...field}
                value={controlled.value}
                onChange={(next) => {
                  controlled.onChange(next);
                  // A different make means the old model no longer applies.
                  if (next !== controlled.value) {
                    setValue("model", "");
                  }
                }}
                options={MAKE_OPTIONS}
                placeholder="Toyota"
                allowCustom
                invalid={Boolean(errors.make)}
                emptyMessage="No match. Keep typing to use what you entered."
                renderPrefix={(option) => <BrandMark make={option.label} size="sm" />}
              />
            )}
          />
        )}
      </FormField>

      <FormField
        id="model"
        label="Model"
        hint={
          make && modelOptions.length === 0
            ? "We do not have a model list for that make, so type it in."
            : undefined
        }
        error={errors.model?.message}
      >
        {(field) => (
          <Controller
            control={control}
            name="model"
            render={({ field: controlled }) => (
              <Combobox
                {...field}
                value={controlled.value}
                onChange={controlled.onChange}
                options={modelOptions}
                placeholder={make ? "Corolla" : "Choose a make first"}
                allowCustom
                disabled={!make}
                invalid={Boolean(errors.model)}
                emptyMessage="No match. Keep typing to use what you entered."
              />
            )}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="year" label="Year" error={errors.year?.message}>
          {(field) => (
            <Select {...field} {...register("year", { valueAsNumber: true })}>
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id="registrationNo"
          label="Registration number"
          hint="For example AS 1234-22."
          error={errors.registrationNo?.message}
        >
          {(field) => (
            <Input
              {...field}
              {...register("registrationNo")}
              placeholder="AS 1234-22"
              autoCapitalize="characters"
              className="font-mono uppercase"
            />
          )}
        </FormField>
      </div>

      {make ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
          <BrandMark make={make} />
          <p className="min-w-0 text-base text-foreground">
            <span className="font-medium">{make}</span>
            <Controller
              control={control}
              name="model"
              render={({ field: controlled }) =>
                controlled.value ? <span> {controlled.value}</span> : <span />
              }
            />
          </p>
        </div>
      ) : null}

      <FormField
        id="notes"
        label="Notes"
        hint="Optional. Anything a technician should know before they start."
        error={errors.notes?.message}
      >
        {(field) => (
          <Textarea
            {...field}
            {...register("notes")}
            placeholder="Takes 5W-30. Aftermarket alarm fitted."
          />
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

"use client";

import { useEffect, useState } from "react";
import { Car, CirclePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { VehicleSilhouette } from "@/components/vehicles/vehicle-silhouette";
import { useVehicles } from "@/hooks/use-vehicles";
import { cn } from "@/lib/utils";

export function StepVehicle({
  vehicleId,
  error,
  onSelect,
}: {
  vehicleId: string | null;
  error?: string | undefined;
  onSelect: (id: string) => void;
}) {
  const vehicles = useVehicles();
  const [isAdding, setIsAdding] = useState(false);

  /*
    One vehicle is the common case, and asking somebody to choose from a list of
    one before they may continue is a tap that exists only to produce an error
    message when they miss it.
  */
  const only = vehicles.data?.data.length === 1 ? vehicles.data.data[0] : undefined;
  useEffect(() => {
    if (only && !vehicleId) {
      onSelect(only.id);
    }
  }, [only, vehicleId, onSelect]);

  if (vehicles.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        <span className="sr-only">Loading your vehicles</span>
        <Skeleton className="h-[4.5rem]" />
        <Skeleton className="h-[4.5rem]" />
      </div>
    );
  }

  if (vehicles.isError) {
    return (
      <ErrorState
        body="We could not load your vehicles. Check your connection and try again."
        onRetry={() => void vehicles.refetch()}
        isRetrying={vehicles.isRefetching}
      />
    );
  }

  const list = vehicles.data.data;

  if (isAdding || list.length === 0) {
    return (
      <div>
        {list.length === 0 ? (
          <p className="mb-5 text-base text-muted-foreground">
            Add the vehicle you want serviced. You only do this once.
          </p>
        ) : null}
        <VehicleForm
          onDone={(vehicle) => {
            onSelect(vehicle.id);
            setIsAdding(false);
          }}
          onCancel={list.length > 0 ? () => setIsAdding(false) : undefined}
          submitLabel="Add and continue"
        />
      </div>
    );
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Your vehicles"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "vehicle-error" : undefined}
        className="grid gap-2"
      >
        {list.map((vehicle) => {
          const isSelected = vehicle.id === vehicleId;

          return (
            <label
              key={vehicle.id}
              className={cn(
                "flex cursor-pointer items-center gap-4 rounded-lg border px-4 py-4",
                "transition-[border-color,background-color,transform] duration-150",
                "hover:border-foreground/30 active:scale-[0.99]",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                "motion-reduce:transition-none motion-reduce:active:scale-100",
                isSelected
                  ? "border-accent bg-accent-subtle dark:bg-accent/15"
                  : "border-input bg-card",
                error && !isSelected && "border-destructive/50",
              )}
            >
              <input
                type="radio"
                name="vehicle"
                className="sr-only"
                checked={isSelected}
                onChange={() => onSelect(vehicle.id)}
              />
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  isSelected ? "border-accent bg-accent" : "border-input",
                )}
              >
                {isSelected ? <span className="size-1.5 rounded-full bg-accent-foreground" /> : null}
              </span>
              <VehicleSilhouette
                make={vehicle.make}
                model={vehicle.model}
                animate={false}
                className="w-20 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-semibold text-foreground">
                  {vehicle.make} {vehicle.model}
                </span>
                <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                  {vehicle.registrationNo} | {vehicle.year}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <p id="vehicle-error" aria-live="polite" className="mt-2 text-sm text-destructive empty:hidden">
        {error ?? ""}
      </p>

      <Button variant="ghost" size="sm" className="mt-3 px-3" onClick={() => setIsAdding(true)}>
        <CirclePlus aria-hidden size={18} />
        Add another vehicle
      </Button>

      {list.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          body="Add a vehicle to book a service."
          className="mt-4"
        />
      ) : null}
    </div>
  );
}

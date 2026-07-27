"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, CirclePlus, Pencil, Trash2 } from "lucide-react";
import type { Vehicle } from "@chrysmec/shared";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useDeleteVehicle, useVehicles } from "@/hooks/use-vehicles";
import { ApiError } from "@/lib/api/client";

export function VehicleManager() {
  const vehicles = useVehicles();
  const deleteMutation = useDeleteVehicle();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(vehicle: Vehicle): Promise<void> {
    setActionError(null);
    setPendingDeleteId(vehicle.id);

    try {
      await deleteMutation.mutateAsync(vehicle.id);
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Could not remove the vehicle. Check your connection and try again.",
      );
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="eyebrow">Your garage</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold text-foreground">My vehicles</h1>
        {!isAdding ? (
          <Button variant="accent" onClick={() => setIsAdding(true)}>
            <CirclePlus aria-hidden size={18} />
            Add a vehicle
          </Button>
        ) : null}
      </div>

      {actionError ? (
        <Alert tone="error" title="Could not do that" className="mt-6">
          {actionError}
        </Alert>
      ) : null}

      {isAdding ? (
        <section className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-5 font-display text-xl font-semibold text-card-foreground">
            Add a vehicle
          </h2>
          <VehicleForm onDone={() => setIsAdding(false)} onCancel={() => setIsAdding(false)} />
        </section>
      ) : null}

      <div className="mt-10">
        {vehicles.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Loading your vehicles</span>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : vehicles.isError ? (
          <ErrorState
            body="We could not load your vehicles. Check your connection and try again."
            onRetry={() => void vehicles.refetch()}
            isRetrying={vehicles.isRefetching}
          />
        ) : vehicles.data.data.length === 0 && !isAdding ? (
          <EmptyState
            icon={Car}
            title="No vehicles yet"
            body="Add the vehicle you want serviced. You only need to do this once."
            action={
              <Button variant="accent" onClick={() => setIsAdding(true)}>
                Add a vehicle
              </Button>
            }
          />
        ) : (
          <ul>
            {vehicles.data.data.map((vehicle) => (
              <li key={vehicle.id} className="border-b border-border py-5">
                {editingId === vehicle.id ? (
                  <div>
                    <h2 className="mb-5 font-display text-xl font-semibold text-foreground">
                      Edit {vehicle.make} {vehicle.model}
                    </h2>
                    <VehicleForm
                      vehicle={vehicle}
                      onDone={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        {vehicle.make} {vehicle.model}
                      </h2>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">
                        {vehicle.registrationNo} | {vehicle.year}
                      </p>
                      {vehicle.notes ? (
                        <p className="mt-2 max-w-prose text-base text-muted-foreground">
                          {vehicle.notes}
                        </p>
                      ) : null}
                      <p className="mt-3 text-sm text-muted-foreground">
                        {vehicle.serviceRequestCount === 0 ? (
                          "No service history yet"
                        ) : (
                          <Link
                            href={`/dashboard/requests?vehicle=${vehicle.id}`}
                            className="text-foreground underline decoration-accent decoration-2 underline-offset-4"
                          >
                            {vehicle.serviceRequestCount} service
                            {vehicle.serviceRequestCount === 1 ? "" : "s"} on record
                          </Link>
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(vehicle.id)}>
                        <Pencil aria-hidden size={16} />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(vehicle)}
                        isPending={pendingDeleteId === vehicle.id}
                        pendingLabel="Removing"
                        aria-label={`Remove ${vehicle.make} ${vehicle.model}`}
                      >
                        <Trash2 aria-hidden size={16} />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

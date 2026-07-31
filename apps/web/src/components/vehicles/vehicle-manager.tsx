"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Car, CirclePlus, Pencil, Trash2 } from "lucide-react";
import type { Vehicle } from "@chrysmec/shared";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { VehicleSilhouette } from "@/components/vehicles/vehicle-silhouette";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useDeleteVehicle, useVehicles } from "@/hooks/use-vehicles";
import { ApiError } from "@/lib/api/client";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function VehicleManager() {
  const vehicles = useVehicles();
  const deleteMutation = useDeleteVehicle();
  const prefersReducedMotion = useReducedMotion();

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
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.data.data.map((vehicle, index) => (
              <motion.li
                key={vehicle.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: motionTokens.base,
                  ease: motionTokens.easeOut,
                  delay: prefersReducedMotion ? 0 : Math.min(index, 6) * 0.04,
                }}
                className={cn(
                  "overflow-hidden rounded-xl border border-border bg-card",
                  "transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-foreground/25",
                  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  editingId === vehicle.id && "sm:col-span-2 lg:col-span-3",
                )}
              >
                {editingId === vehicle.id ? (
                  <div className="p-5 sm:p-6">
                    <h2 className="mb-5 font-display text-xl font-semibold text-card-foreground">
                      Edit {vehicle.make} {vehicle.model}
                    </h2>
                    <VehicleForm
                      vehicle={vehicle}
                      onDone={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    {/* The car sits on its own tinted shelf so the turntable has
                        somewhere to stand and never crowds the name. */}
                    <div className="flex justify-center border-b border-border bg-muted/50 px-5 pt-5 pb-2">
                      <VehicleSilhouette
                        make={vehicle.make}
                        model={vehicle.model}
                        className="w-full max-w-56"
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="font-display text-xl font-semibold text-balance text-card-foreground">
                        {vehicle.make} {vehicle.model}
                      </h2>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">
                        {vehicle.registrationNo} | {vehicle.year}
                      </p>
                      {vehicle.notes ? (
                        <p className="mt-2 text-base text-muted-foreground">{vehicle.notes}</p>
                      ) : null}

                      <p className="mt-3 text-sm text-muted-foreground">
                        {vehicle.serviceRequestCount === 0 ? (
                          "No service history yet"
                        ) : (
                          <Link
                            href={`/dashboard/requests?vehicle=${vehicle.id}`}
                            className="inline-flex min-h-11 items-center text-foreground underline decoration-accent decoration-2 underline-offset-4"
                          >
                            {vehicle.serviceRequestCount} service
                            {vehicle.serviceRequestCount === 1 ? "" : "s"} on record
                          </Link>
                        )}
                      </p>

                      <div className="mt-auto flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(vehicle.id)}
                        >
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
                  </div>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

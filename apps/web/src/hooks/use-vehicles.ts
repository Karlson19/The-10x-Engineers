"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateVehicleRequest, UpdateVehicleRequest } from "@chrysmec/shared";
import { createVehicle, deleteVehicle, fetchVehicles, updateVehicle } from "@/lib/api/vehicles";

export const VEHICLES_KEY = ["vehicles"] as const;

export function useVehicles() {
  return useQuery({ queryKey: VEHICLES_KEY, queryFn: fetchVehicles });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateVehicleRequest) => createVehicle(input),
    meta: { inlineError: true },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: VEHICLES_KEY });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVehicleRequest }) =>
      updateVehicle(id, input),
    meta: { inlineError: true },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: VEHICLES_KEY });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    meta: { inlineError: true },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: VEHICLES_KEY });
    },
  });
}

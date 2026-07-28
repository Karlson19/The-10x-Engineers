"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateInventoryItem, Section, UpdateInventoryItem } from "@chrysmec/shared";
import {
  createInventoryItem,
  fetchInventory,
  restockInventoryItem,
  updateInventoryItem,
} from "@/lib/api/inventory";

export const INVENTORY_KEY = ["inventory"] as const;

export function useInventory(options: { section?: Section; lowStock?: boolean } = {}) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, options] as const,
    queryFn: () => fetchInventory(options),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInventoryItem) => createInventoryItem(input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInventoryItem }) =>
      updateInventoryItem(id, input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
    },
  });
}

export function useRestockInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      restockInventoryItem(id, quantity),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
    },
  });
}

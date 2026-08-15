"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdjustStock,
  CreateInventoryItem,
  ReceiveStock,
  Section,
  UpdateInventoryItem,
} from "@chrysmec/shared";
import {
  adjustStock,
  createInventoryItem,
  fetchInventory,
  fetchStockHistory,
  receiveStock,
  updateInventoryItem,
} from "@/lib/api/inventory";

export const INVENTORY_KEY = ["inventory"] as const;

export function useInventory(
  options: { section?: Section; lowStock?: boolean; search?: string } = {},
) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, options] as const,
    queryFn: () => fetchInventory(options),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInventoryItem) => createInventoryItem(input),
    meta: { inlineError: true },
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
    meta: { inlineError: true },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
    },
  });
}

export function useReceiveStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReceiveStock }) => receiveStock(id, input),
    meta: { inlineError: true },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustStock }) => adjustStock(id, input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
    },
  });
}

/** The ledger for one part: every movement, and what it has cost over time. */
export function useStockHistory(id: string | null) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, "history", id] as const,
    queryFn: () => fetchStockHistory(id ?? ""),
    enabled: Boolean(id),
  });
}

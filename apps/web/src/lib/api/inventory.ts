import { z } from "zod";
import {
  type CreateInventoryItem,
  type InventoryItem,
  type InventoryListResponse,
  type Section,
  type UpdateInventoryItem,
  inventoryItemSchema,
  inventoryListResponseSchema,
} from "@chrysmec/shared";
import { apiRequest } from "./client";

const itemResponseSchema = z.object({ item: inventoryItemSchema });

export function fetchInventory(
  options: { section?: Section; lowStock?: boolean } = {},
): Promise<InventoryListResponse> {
  const params = new URLSearchParams({ limit: "100" });

  if (options.section) {
    params.set("section", options.section);
  }
  if (options.lowStock) {
    params.set("lowStock", "true");
  }

  return apiRequest(`/inventory?${params.toString()}`, inventoryListResponseSchema);
}

export async function createInventoryItem(input: CreateInventoryItem): Promise<InventoryItem> {
  return (await apiRequest("/inventory", itemResponseSchema, { method: "POST", body: input })).item;
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItem,
): Promise<InventoryItem> {
  return (
    await apiRequest(`/inventory/${id}`, itemResponseSchema, { method: "PATCH", body: input })
  ).item;
}

export async function restockInventoryItem(id: string, quantity: number): Promise<InventoryItem> {
  return (
    await apiRequest(`/inventory/${id}/restock`, itemResponseSchema, {
      method: "POST",
      body: { quantity },
    })
  ).item;
}

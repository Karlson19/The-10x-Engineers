import { z } from "zod";
import {
  type AdjustStock,
  type CreateInventoryItem,
  type InventoryItem,
  type InventoryListResponse,
  type ReceiveStock,
  type Section,
  type StockHistoryResponse,
  type UpdateInventoryItem,
  inventoryItemSchema,
  inventoryListResponseSchema,
  stockHistoryResponseSchema,
} from "@chrysmec/shared";
import { apiRequest } from "./client";

const itemResponseSchema = z.object({ item: inventoryItemSchema });

export function fetchInventory(
  options: { section?: Section; lowStock?: boolean; search?: string } = {},
): Promise<InventoryListResponse> {
  const params = new URLSearchParams({ limit: "100" });

  if (options.section) {
    params.set("section", options.section);
  }
  if (options.lowStock) {
    params.set("lowStock", "true");
  }
  if (options.search) {
    params.set("search", options.search);
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

/**
 * Stock arriving, with what was paid for it. This replaced a restock that took
 * a quantity and nothing else, which is why the price of a part over time could
 * never be answered.
 */
export async function receiveStock(id: string, input: ReceiveStock): Promise<InventoryItem> {
  return (
    await apiRequest(`/inventory/${id}/receive`, itemResponseSchema, {
      method: "POST",
      body: input,
    })
  ).item;
}

/** A stock take correction, which has to carry a reason. */
export async function adjustStock(id: string, input: AdjustStock): Promise<InventoryItem> {
  return (
    await apiRequest(`/inventory/${id}/adjust`, itemResponseSchema, {
      method: "POST",
      body: input,
    })
  ).item;
}

/** Everything that has happened to a part, and what it has cost. */
export function fetchStockHistory(id: string): Promise<StockHistoryResponse> {
  return apiRequest(`/inventory/${id}/history`, stockHistoryResponseSchema);
}

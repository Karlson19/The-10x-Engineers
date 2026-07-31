import { z } from "zod";
import {
  type CreateServiceCatalogItem,
  type ServiceCatalogItem,
  type ServiceCatalogueResponse,
  type UpdateServiceCatalogItem,
  serviceCatalogItemSchema,
  serviceCatalogueResponseSchema,
} from "@chrysmec/shared";
import { apiRequest } from "./client";

const itemResponseSchema = z.object({ item: serviceCatalogItemSchema });

/** Management sees retired services too, so prices can be brought back. */
export function fetchManagedCatalogue(includeInactive = true): Promise<ServiceCatalogueResponse> {
  const query = includeInactive ? "?includeInactive=true" : "";
  return apiRequest(`/services${query}`, serviceCatalogueResponseSchema);
}

export async function createCatalogueItem(
  input: CreateServiceCatalogItem,
): Promise<ServiceCatalogItem> {
  return (await apiRequest("/services", itemResponseSchema, { method: "POST", body: input })).item;
}

export async function updateCatalogueItem(
  id: string,
  input: UpdateServiceCatalogItem,
): Promise<ServiceCatalogItem> {
  return (await apiRequest(`/services/${id}`, itemResponseSchema, { method: "PATCH", body: input }))
    .item;
}

/** Retires rather than deletes, so past bookings still say what was asked for. */
export async function retireCatalogueItem(id: string): Promise<ServiceCatalogItem> {
  return (await apiRequest(`/services/${id}`, itemResponseSchema, { method: "DELETE" })).item;
}

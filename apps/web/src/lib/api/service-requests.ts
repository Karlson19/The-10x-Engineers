import {
  type CreateServiceRequest,
  type ServiceCatalogueResponse,
  type ServiceRequest,
  type ServiceRequestListQuery,
  type ServiceRequestListResponse,
  type Section,
  type StatusEvent,
  type UpdateServiceRequest,
  type UpdateStatusRequest,
  serviceCatalogueResponseSchema,
  serviceRequestListResponseSchema,
  serviceRequestResponseSchema,
  timelineResponseSchema,
} from "@chrysmec/shared";
import { apiRequest, apiRequestVoid } from "./client";

export type RequestFilters = Partial<Pick<ServiceRequestListQuery, "status" | "vehicleId">>;

function toQueryString(filters: RequestFilters): string {
  const params = new URLSearchParams({ limit: "50" });

  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.vehicleId) {
    params.set("vehicleId", filters.vehicleId);
  }

  return params.toString();
}

export function fetchServiceRequests(
  filters: RequestFilters = {},
): Promise<ServiceRequestListResponse> {
  return apiRequest(`/service-requests?${toQueryString(filters)}`, serviceRequestListResponseSchema);
}

export async function fetchServiceRequest(id: string): Promise<ServiceRequest> {
  const result = await apiRequest(`/service-requests/${id}`, serviceRequestResponseSchema);
  return result.serviceRequest;
}

export async function fetchTimeline(id: string): Promise<StatusEvent[]> {
  const result = await apiRequest(`/service-requests/${id}/timeline`, timelineResponseSchema);
  return result.data;
}

export async function createServiceRequest(input: CreateServiceRequest): Promise<ServiceRequest> {
  const result = await apiRequest("/service-requests", serviceRequestResponseSchema, {
    method: "POST",
    body: input,
  });
  return result.serviceRequest;
}

export async function updateServiceRequest(
  id: string,
  input: UpdateServiceRequest,
): Promise<ServiceRequest> {
  const result = await apiRequest(`/service-requests/${id}`, serviceRequestResponseSchema, {
    method: "PATCH",
    body: input,
  });
  return result.serviceRequest;
}

export async function updateServiceRequestStatus(
  id: string,
  input: UpdateStatusRequest,
): Promise<ServiceRequest> {
  const result = await apiRequest(`/service-requests/${id}/status`, serviceRequestResponseSchema, {
    method: "PATCH",
    body: input,
  });
  return result.serviceRequest;
}

export function deleteServiceRequest(id: string): Promise<void> {
  return apiRequestVoid(`/service-requests/${id}`, { method: "DELETE" });
}

export function fetchCatalogue(section?: Section): Promise<ServiceCatalogueResponse> {
  const query = section ? `?section=${section}` : "";
  return apiRequest(`/services${query}`, serviceCatalogueResponseSchema);
}

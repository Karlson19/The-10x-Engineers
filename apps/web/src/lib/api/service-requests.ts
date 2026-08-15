import { z } from "zod";
import {
  type CreateFeedback,
  type CreateServiceRequest,
  type Feedback,
  type RequestInvoice,
  type ServiceCatalogueResponse,
  type ServiceRequest,
  type ServiceRequestListQuery,
  type ServiceRequestListResponse,
  type Section,
  type StatusEvent,
  type UpdateServiceRequest,
  type UpdateStatusRequest,
  feedbackResponseSchema,
  feedbackSchema,
  requestInvoiceResponseSchema,
  serviceCatalogueResponseSchema,
  serviceRequestListResponseSchema,
  serviceRequestResponseSchema,
  timelineResponseSchema,
} from "@chrysmec/shared";
import { apiRequest, apiRequestVoid } from "./client";

/** Reading feedback answers null when none has been left, which is normal. */
const feedbackReadSchema = z.object({ feedback: feedbackSchema.nullable() });

export type RequestFilters = Partial<
  Pick<ServiceRequestListQuery, "status" | "vehicleId" | "section" | "search" | "page" | "limit">
>;

function toQueryString(filters: RequestFilters): string {
  const params = new URLSearchParams({ limit: String(filters.limit ?? 50) });

  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.vehicleId) {
    params.set("vehicleId", filters.vehicleId);
  }
  if (filters.section) {
    params.set("section", filters.section);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
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

/** What was done on the vehicle and what it came to. */
export async function fetchRequestInvoice(id: string): Promise<RequestInvoice> {
  const result = await apiRequest(
    `/service-requests/${id}/invoice`,
    requestInvoiceResponseSchema,
  );
  return result.invoice;
}

export async function fetchFeedback(id: string): Promise<Feedback | null> {
  const result = await apiRequest(`/service-requests/${id}/feedback`, feedbackReadSchema);
  return result.feedback;
}

export async function leaveFeedback(id: string, input: CreateFeedback): Promise<Feedback> {
  const result = await apiRequest(`/service-requests/${id}/feedback`, feedbackResponseSchema, {
    method: "POST",
    body: input,
  });
  return result.feedback;
}

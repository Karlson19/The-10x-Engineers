"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateServiceRequest, Section, UpdateStatusRequest } from "@chrysmec/shared";
import {
  type RequestFilters,
  createServiceRequest,
  deleteServiceRequest,
  fetchCatalogue,
  fetchServiceRequest,
  fetchServiceRequests,
  fetchTimeline,
  updateServiceRequestStatus,
} from "@/lib/api/service-requests";

export const REQUESTS_KEY = ["service-requests"] as const;

export function useServiceRequests(filters: RequestFilters = {}) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, "list", filters] as const,
    queryFn: () => fetchServiceRequests(filters),
  });
}

export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, "detail", id] as const,
    queryFn: () => fetchServiceRequest(id),
    enabled: id.length > 0,
  });
}

export function useTimeline(id: string) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, "timeline", id] as const,
    queryFn: () => fetchTimeline(id),
    enabled: id.length > 0,
  });
}

export function useCatalogue(section: Section | null) {
  return useQuery({
    queryKey: ["catalogue", section] as const,
    queryFn: () => fetchCatalogue(section ?? undefined),
    enabled: section !== null,
    // The catalogue barely changes. Do not spend a request on it every visit.
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateServiceRequest) => createServiceRequest(input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

/**
 * Used by staff to move a booking on, and by a customer to approve or decline
 * an estimate. Which moves each role may make is decided on the server.
 */
export function useUpdateServiceRequestStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateStatusRequest) => updateServiceRequestStatus(id, input),
    onSuccess(updated) {
      queryClient.setQueryData([...REQUESTS_KEY, "detail", id], updated);
      void queryClient.invalidateQueries({ queryKey: [...REQUESTS_KEY, "timeline", id] });
      void queryClient.invalidateQueries({ queryKey: [...REQUESTS_KEY, "list"] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useDeleteServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteServiceRequest(id),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
    },
  });
}

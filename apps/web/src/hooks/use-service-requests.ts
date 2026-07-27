"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateServiceRequest, Section } from "@chrysmec/shared";
import {
  type RequestFilters,
  createServiceRequest,
  deleteServiceRequest,
  fetchCatalogue,
  fetchServiceRequest,
  fetchServiceRequests,
  fetchTimeline,
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

export function useDeleteServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteServiceRequest(id),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
    },
  });
}

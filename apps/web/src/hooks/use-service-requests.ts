"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateFeedback,
  CreateServiceRequest,
  RequestStatus,
  Section,
  ServiceRequest,
  UpdateStatusRequest,
} from "@chrysmec/shared";
import {
  type RequestFilters,
  createServiceRequest,
  deleteServiceRequest,
  fetchCatalogue,
  fetchFeedback,
  fetchRequestInvoice,
  fetchServiceRequest,
  fetchServiceRequests,
  fetchTimeline,
  leaveFeedback,
  updateServiceRequestStatus,
} from "@/lib/api/service-requests";

export const REQUESTS_KEY = ["service-requests"] as const;

export function useServiceRequests(filters: RequestFilters = {}) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, "list", filters] as const,
    queryFn: () => fetchServiceRequests(filters),
  });
}

/**
 * How often a booking still being worked on re-checks itself.
 *
 * The promise of this product is that you always know where your vehicle is,
 * which a page that only updates when you reload it does not keep. Paused
 * automatically while the tab is in the background, so it costs nothing on a
 * metered connection when nobody is looking.
 */
const LIVE_POLL_MS = 45_000;

/** Terminal bookings never change again, so they stop asking. */
function pollWhileOpen(status: RequestStatus | undefined): number | false {
  if (status === "COMPLETED" || status === "CANCELLED") {
    return false;
  }
  return LIVE_POLL_MS;
}

export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, "detail", id] as const,
    queryFn: () => fetchServiceRequest(id),
    enabled: id.length > 0,
    refetchInterval: (query) => pollWhileOpen(query.state.data?.status),
  });
}

export function useTimeline(id: string, status?: RequestStatus) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, "timeline", id] as const,
    queryFn: () => fetchTimeline(id),
    enabled: id.length > 0,
    // Follows the booking: a new stage should appear on the stepper without the
    // customer having to reload to find it.
    refetchInterval: pollWhileOpen(status),
  });
}

export function useRequestInvoice(id: string) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, "invoice", id] as const,
    queryFn: () => fetchRequestInvoice(id),
    enabled: id.length > 0,
  });
}

export function useFeedback(id: string) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, "feedback", id] as const,
    queryFn: () => fetchFeedback(id),
    enabled: id.length > 0,
  });
}

export function useLeaveFeedback(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFeedback) => leaveFeedback(id, input),
    onSuccess(feedback) {
      queryClient.setQueryData([...REQUESTS_KEY, "feedback", id], feedback);
    },
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
  const detailKey = [...REQUESTS_KEY, "detail", id] as const;

  return useMutation({
    mutationFn: (input: UpdateStatusRequest) => updateServiceRequestStatus(id, input),

    /*
      The badge moves the moment the button is pressed rather than after the
      round trip. On a cold API that round trip is seconds, and watching a
      screen do nothing after you have pressed something is what makes an app
      feel broken. The server still decides: if it refuses, onError puts the
      old status back and the caller shows the reason.
    */
    async onMutate(input) {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<ServiceRequest>(detailKey);

      if (previous) {
        queryClient.setQueryData<ServiceRequest>(detailKey, {
          ...previous,
          status: input.status,
          estimatedCost: input.estimatedCost ?? previous.estimatedCost,
        });
      }

      return { previous };
    },

    onError(_error, _input, context) {
      if (context?.previous) {
        queryClient.setQueryData(detailKey, context.previous);
      }
    },

    onSuccess(updated) {
      queryClient.setQueryData([...REQUESTS_KEY, "detail", id], updated);
      void queryClient.invalidateQueries({ queryKey: [...REQUESTS_KEY, "timeline", id] });
      void queryClient.invalidateQueries({ queryKey: [...REQUESTS_KEY, "list"] });
      void queryClient.invalidateQueries({ queryKey: [...REQUESTS_KEY, "invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      // Finishing or cancelling a booking moves the management figures.
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
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

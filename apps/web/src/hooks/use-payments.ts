"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmPayment, fetchPayments, initializePayment } from "@/lib/api/payments";

export const PAYMENTS_KEY = ["payments"] as const;

export function usePayments(serviceRequestId?: string) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, serviceRequestId ?? "all"] as const,
    queryFn: () => fetchPayments(serviceRequestId),
  });
}

export function useInitializePayment() {
  return useMutation({
    mutationFn: (serviceRequestId: string) => initializePayment(serviceRequestId),
    meta: { inlineError: true },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reference: string) => confirmPayment(reference),
    meta: { inlineError: true },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
      // A settled payment changes the bill and the management figures.
      void queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

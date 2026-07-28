"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAnalyticsSummary, fetchTechnicians } from "@/lib/api/analytics";

export function useAnalyticsSummary(period: string) {
  return useQuery({
    queryKey: ["analytics", "summary", period] as const,
    queryFn: () => fetchAnalyticsSummary(period),
  });
}

export function useTechnicians() {
  return useQuery({
    queryKey: ["users", "technicians"] as const,
    queryFn: fetchTechnicians,
    // The staff list barely changes during a shift.
    staleTime: 5 * 60 * 1000,
  });
}

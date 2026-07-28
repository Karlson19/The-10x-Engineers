import { z } from "zod";
import {
  type AnalyticsSummary,
  analyticsSummaryResponseSchema,
  publicUserSchema,
} from "@chrysmec/shared";
import { apiRequest } from "./client";

export async function fetchAnalyticsSummary(period?: string): Promise<AnalyticsSummary> {
  const query = period ? `?period=${period}` : "";
  return (await apiRequest(`/analytics/summary${query}`, analyticsSummaryResponseSchema)).summary;
}

const userListSchema = z.object({ data: z.array(publicUserSchema) });

/** The technician picker on the assign dialog. */
export function fetchTechnicians() {
  return apiRequest("/users?role=STAFF&isActive=true&limit=100", userListSchema);
}

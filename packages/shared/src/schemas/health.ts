import { z } from "zod";

/**
 * GET /health. Used by the uptime workflow to keep the Render free instance
 * from sleeping, and by the client to decide whether the API is reachable.
 */
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.string(),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  database: z.enum(["up", "down"]),
  timestamp: z.iso.datetime(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

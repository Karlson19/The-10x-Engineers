import type { HealthResponse } from "@chrysmec/shared";
import { APP_NAME, APP_VERSION } from "../config/env";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/**
 * Health stays a 200 even when the database is unreachable: the uptime workflow
 * uses it to keep the Render instance awake, and a red ping there would only
 * hide the real signal, which is the `database` field.
 */
export async function getHealth(): Promise<HealthResponse> {
  let database: HealthResponse["database"] = "up";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = "down";
    logger.error({ err: error }, "Database health check failed");
  }

  return {
    status: database === "up" ? "ok" : "degraded",
    service: APP_NAME,
    version: APP_VERSION,
    uptimeSeconds: Math.round(process.uptime()),
    database,
    timestamp: new Date().toISOString(),
  };
}

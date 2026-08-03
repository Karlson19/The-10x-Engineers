import type { HealthResponse } from "@chrysmec/shared";
import { APP_NAME, APP_VERSION } from "../config/env";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/**
 * How long the database gets to answer before health reports without it.
 *
 * The platform's own check calls this endpoint to decide whether a deploy came
 * up, and it will not wait long. The database is a Neon instance that suspends
 * when idle and can take the better part of a minute to wake, so a probe that
 * simply awaited it held the whole response open and got the deploy marked as
 * failed while the service itself was perfectly healthy.
 */
const DATABASE_PROBE_MS = 5000;

/**
 * Health stays a 200 even when the database is unreachable: the uptime workflow
 * uses it to keep the Render instance awake, and a red ping there would only
 * hide the real signal, which is the `database` field.
 *
 * It also answers promptly whatever the database is doing. Whether this process
 * is serving requests and whether Neon happens to be awake are two different
 * questions, and only the first one decides if a deploy is live.
 */
export async function getHealth(): Promise<HealthResponse> {
  let database: HealthResponse["database"] = "up";
  let timer: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Database probe timed out")), DATABASE_PROBE_MS);
      }),
    ]);
  } catch (error) {
    database = "down";
    logger.error({ err: error }, "Database health check failed");
  } finally {
    clearTimeout(timer);
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

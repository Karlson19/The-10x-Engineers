import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

/**
 * One client per process. tsx watch reloads the module on every save, so the
 * instance is cached on globalThis to avoid exhausting the connection pool in
 * development.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ["warn", "error"] : ["warn", "error"],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

/**
 * Prisma gives an interactive transaction 5 seconds by default, measured from
 * the moment it opens. The database is hosted in Europe and the users are in
 * Ghana, so a handful of round trips inside one transaction can pass that
 * ceiling on a normal connection and fail a booking that was perfectly valid.
 * These allow for that latency without letting a stuck transaction sit open.
 */
export const TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

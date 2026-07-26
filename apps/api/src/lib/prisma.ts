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

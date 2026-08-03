import { API_BASE_PATH } from "@chrysmec/shared";
import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `Chrysmec API listening on http://localhost:${env.PORT}${API_BASE_PATH}`,
  );
});

/*
  Open the pool as soon as we are listening rather than leaving it to whichever
  request arrives first. On a fresh deploy that request is the platform's health
  check, and making it pay for establishing a connection to a Neon instance that
  may be asleep is how a perfectly healthy deploy gets marked as failed.

  Deliberately not awaited and never fatal: the server answers either way, and
  health reports the database separately.
*/
void prisma
  .$connect()
  .then(() => logger.info("Database pool ready"))
  .catch((error: unknown) => logger.error({ err: error }, "Could not open the database pool"));

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down");
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });

  // Do not hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

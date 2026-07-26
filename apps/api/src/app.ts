import express, { type Express } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { API_BASE_PATH, MAX_JSON_BODY_SIZE } from "@chrysmec/shared";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiRouter } from "./routes";
import { healthRouter } from "./routes/health.routes";

export function createApp(): Express {
  const app = express();

  // Render and Vercel sit behind a proxy. Without this the client IP used for
  // rate limiting is the proxy's, not the caller's.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Same origin and server to server calls arrive without an Origin header.
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed.`));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: MAX_JSON_BODY_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: MAX_JSON_BODY_SIZE }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      // The uptime ping runs every 10 minutes. Logging it at info level buries
      // everything else.
      autoLogging: { ignore: (req) => req.url === "/health" },
    }),
  );

  // Root level health for the platform's own checks and the uptime workflow.
  app.use(healthRouter);
  app.use(API_BASE_PATH, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();

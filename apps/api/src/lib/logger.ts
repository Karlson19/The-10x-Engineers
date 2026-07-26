import { pino } from "pino";
import { env } from "../config/env";

/**
 * Passwords, tokens and payment payloads must never reach the log stream.
 * Redaction is applied at the logger, not at each call site, so a new route
 * cannot forget it.
 */
const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "*.password",
  "*.passwordHash",
  "*.accessToken",
  "*.refreshToken",
  "*.authorization",
];

export const logger = pino({
  level: env.isTest ? "silent" : env.isProduction ? "info" : "debug",
  redact: { paths: redactPaths, censor: "[redacted]" },
  base: { service: "chrysmec-api" },
  transport: env.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname,service" },
      },
});

export type Logger = typeof logger;

import rateLimit from "express-rate-limit";
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from "@chrysmec/shared";
import { env } from "../config/env";

/**
 * Ten attempts per IP per 15 minutes across all /auth routes, so credential
 * stuffing is slow and expensive. Disabled under test, where a suite makes far
 * more than ten calls on purpose.
 */
export const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.isTest,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many attempts. Wait 15 minutes and try again.",
    },
  },
});

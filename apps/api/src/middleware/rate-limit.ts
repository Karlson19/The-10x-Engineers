import rateLimit from "express-rate-limit";
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from "@chrysmec/shared";
import { env } from "../config/env";

const message = {
  error: {
    code: "RATE_LIMITED",
    message: "Too many attempts. Wait 15 minutes and try again.",
  },
};

/**
 * Ten attempts per IP per 15 minutes on the routes that take a password, so
 * credential stuffing is slow and expensive.
 *
 * Disabled under test, where a suite makes far more than ten calls on purpose.
 */
export const credentialRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.isTest,
  message,
});

/**
 * Refresh, logout and me carry no password and are called by ordinary use:
 * the access token only lives in memory, so every page load refreshes once.
 * Holding these to the credential budget would lock a customer out of their
 * own session after a handful of reloads, which is exactly what happens on a
 * connection that keeps dropping.
 *
 * The limit here is only a ceiling on abuse, not a defence against guessing,
 * because these routes have nothing to guess.
 */
export const sessionRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.isTest,
  message,
});

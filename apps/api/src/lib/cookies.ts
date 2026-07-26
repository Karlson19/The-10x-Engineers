import type { CookieOptions, Response } from "express";
import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from "@chrysmec/shared";
import { env } from "../config/env";

/**
 * In production the browser is on Vercel and the API is on Render, which is a
 * cross-site request, so the cookie has to be SameSite=None and therefore
 * Secure. In development both run on localhost, where SameSite=Lax works and
 * does not need HTTPS.
 */
function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, options);
}

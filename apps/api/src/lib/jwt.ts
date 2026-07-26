import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  roleSchema,
  sectionSchema,
} from "@chrysmec/shared";
import { env } from "../config/env";
import { HttpError } from "./http-error";

const ISSUER = "chrysmec-api";

/**
 * Access and refresh tokens are signed with different secrets and carry a
 * `typ` claim, so a refresh token can never be presented as an access token
 * even if one secret is ever reused by mistake.
 */
const accessPayloadSchema = z.object({
  sub: z.uuid(),
  role: roleSchema,
  section: sectionSchema.nullable(),
  typ: z.literal("access"),
});
export type AccessTokenPayload = z.infer<typeof accessPayloadSchema>;

const refreshPayloadSchema = z.object({
  sub: z.uuid(),
  typ: z.literal("refresh"),
});
export type RefreshTokenPayload = z.infer<typeof refreshPayloadSchema>;

export function signAccessToken(payload: Omit<AccessTokenPayload, "typ">): string {
  return jwt.sign({ ...payload, typ: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: ISSUER,
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    issuer: ISSUER,
  });
}

function verify(token: string, secret: string): unknown {
  try {
    return jwt.verify(token, secret, { issuer: ISSUER });
  } catch {
    // Expired, tampered with and malformed all look the same to the caller.
    // Saying which one it was only helps someone probing the API.
    throw HttpError.unauthenticated("Your session is not valid. Sign in again.");
  }
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const parsed = accessPayloadSchema.safeParse(verify(token, env.JWT_ACCESS_SECRET));
  if (!parsed.success) {
    throw HttpError.unauthenticated("Your session is not valid. Sign in again.");
  }
  return parsed.data;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const parsed = refreshPayloadSchema.safeParse(verify(token, env.JWT_REFRESH_SECRET));
  if (!parsed.success) {
    throw HttpError.unauthenticated("Your session has expired. Sign in again.");
  }
  return parsed.data;
}

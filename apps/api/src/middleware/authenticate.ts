import type { Request, RequestHandler } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";

function readBearerToken(req: Request): string {
  const header = req.header("authorization");

  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw HttpError.unauthenticated("Sign in to continue.");
  }

  const token = header.slice("bearer ".length).trim();
  if (token.length === 0) {
    throw HttpError.unauthenticated("Sign in to continue.");
  }

  return token;
}

/**
 * Verifies the access token, then reloads the account from the database. The
 * database row is the source of truth for role and section, so a deactivated
 * account or a changed role takes effect on the next request rather than when
 * the token happens to expire.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const payload = verifyAccessToken(readBearerToken(req));

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, fullName: true, email: true, role: true, section: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw HttpError.unauthenticated("Your account is no longer active. Contact the workshop.");
  }

  req.auth = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    section: user.section,
  };

  next();
};

/** Reads the authenticated user, or fails loudly if a route forgot to authenticate. */
export function requireAuthUser(req: Request): AuthenticatedUser {
  if (!req.auth) {
    throw HttpError.unauthenticated("Sign in to continue.");
  }
  return req.auth;
}

import type { RequestHandler } from "express";
import type { Role } from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { requireAuthUser } from "./authenticate";

/**
 * Role check, always run on the server. Hiding a button in the client is not
 * access control, so every restricted route carries this.
 */
export function requireRole(...allowed: readonly Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = requireAuthUser(req);

    if (!allowed.includes(user.role)) {
      throw HttpError.forbidden("You do not have access to that.");
    }

    next();
  };
}

/**
 * Ownership check for records that belong to a single client. Management sees
 * everything, a client sees only their own, and staff are handled by their own
 * section rules on the routes that need them.
 *
 * Returning 404 rather than 403 to a client who is not the owner means the API
 * does not confirm that someone else's record exists.
 */
export function assertOwnership(
  user: { id: string; role: Role },
  ownerId: string,
  notFoundMessage = "We could not find what you asked for.",
): void {
  if (user.role === "MANAGEMENT") {
    return;
  }

  if (user.id !== ownerId) {
    throw HttpError.notFound(notFoundMessage);
  }
}

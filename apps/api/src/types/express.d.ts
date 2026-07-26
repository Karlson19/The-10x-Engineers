import type { AuthenticatedUser } from "./auth";

declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware. Read it through requireAuthUser. */
      auth?: AuthenticatedUser;
    }
  }
}

export {};

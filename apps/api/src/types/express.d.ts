import type { AuthenticatedUser } from "./auth";

declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware. Read it through requireAuthUser. */
      auth?: AuthenticatedUser;
      /**
       * The unparsed request body, kept by the JSON parser.
       *
       * Only the Paystack webhook needs it: the signature is an HMAC over the
       * exact bytes that were sent, and re-serialising the parsed object would
       * not reproduce them.
       */
      rawBody?: Buffer;
    }
  }
}

export {};

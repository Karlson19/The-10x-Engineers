import type { ErrorCode } from "@chrysmec/shared";

/**
 * Every deliberate failure in the API is thrown as an HttpError. The error
 * handler turns it into the one error envelope the contract promises.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: Record<string, unknown>): HttpError {
    return new HttpError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthenticated(message = "You need to sign in to do that."): HttpError {
    return new HttpError(401, "UNAUTHENTICATED", message);
  }

  static forbidden(message = "You do not have access to that."): HttpError {
    return new HttpError(403, "FORBIDDEN", message);
  }

  static notFound(message = "We could not find what you asked for."): HttpError {
    return new HttpError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, details?: Record<string, unknown>): HttpError {
    return new HttpError(409, "CONFLICT", message, details);
  }

  static invalidTransition(message: string, details?: Record<string, unknown>): HttpError {
    return new HttpError(400, "INVALID_TRANSITION", message, details);
  }

  static insufficientStock(message: string, details?: Record<string, unknown>): HttpError {
    return new HttpError(409, "INSUFFICIENT_STOCK", message, details);
  }
}

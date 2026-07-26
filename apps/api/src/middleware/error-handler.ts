import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import type { ErrorCode, ErrorEnvelope } from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { logger } from "../lib/logger";

function envelope(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ErrorEnvelope {
  return { error: details ? { code, message, details } : { code, message } };
}

/** Anything that reaches here is a route that does not exist. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res
    .status(404)
    .json(envelope("NOT_FOUND", `No route matches ${req.method} ${req.originalUrl}.`));
};

/**
 * The single place an error becomes a response. Express 5 forwards rejected
 * promises here automatically, so route handlers do not need try/catch.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json(envelope(err.code, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_";
      fieldErrors[key] = issue.message;
    }
    res
      .status(400)
      .json(envelope("VALIDATION_ERROR", "Some of the details you sent are not valid.", fieldErrors));
    return;
  }

  // body-parser rejects oversized and malformed JSON with a typed error.
  if (typeof err === "object" && err !== null && "type" in err) {
    const bodyParserType = (err as { type?: unknown }).type;
    if (bodyParserType === "entity.too.large") {
      res
        .status(413)
        .json(envelope("PAYLOAD_TOO_LARGE", "That request is too large. Send less data and try again."));
      return;
    }
    if (bodyParserType === "entity.parse.failed") {
      res
        .status(400)
        .json(envelope("VALIDATION_ERROR", "The request body is not valid JSON."));
      return;
    }
  }

  logger.error({ err }, "Unhandled error");
  res
    .status(500)
    .json(
      envelope("INTERNAL_ERROR", "Something went wrong on our side. Try again in a moment."),
    );
};

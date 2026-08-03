import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants";

/** Machine readable codes carried in the error envelope. */
export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_TRANSITION",
  "INSUFFICIENT_STOCK",
  "RATE_LIMITED",
  "PAYLOAD_TOO_LARGE",
  /** The payment provider refused, or could not be reached. Not our fault, and not the customer's. */
  "PAYMENT_FAILED",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/**
 * The one failure shape the API returns, for every error, everywhere.
 * { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
 */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/** Path parameter shape for every :id route. */
export const idParamSchema = z.object({
  id: z.uuid({ message: "Not a valid identifier." }),
});
export type IdParam = z.infer<typeof idParamSchema>;

/** Query string paging, shared by every list endpoint. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/** Wraps any item schema in the standard list response. */
export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    meta: paginationMetaSchema,
  });
}

/**
 * Prisma Decimal values are serialised as strings so no precision is lost in
 * JSON. This validates that shape on the way back in.
 */
export const moneySchema = z
  .string()
  .regex(/^-?\d{1,8}(\.\d{1,2})?$/, "Must be an amount with at most two decimal places.");
export type Money = z.infer<typeof moneySchema>;

/** Client generated UUID used as the offline outbox idempotency key. */
export const clientRequestIdSchema = z.uuid({
  message: "Not a valid client request identifier.",
});

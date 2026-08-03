import { z } from "zod";
import { paymentMethodSchema, paymentStatusSchema } from "../enums";
import { moneySchema, paginationQuerySchema } from "./common";

export const paymentSchema = z.object({
  id: z.uuid(),
  serviceRequestId: z.uuid(),
  /** The booking's own reference, so a payment can be discussed on the phone. */
  requestReference: z.string(),
  amount: moneySchema,
  currency: z.string(),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  /** What Paystack knows this payment as. Printed on the receipt. */
  reference: z.string(),
  createdAt: z.iso.datetime(),
});
export type Payment = z.infer<typeof paymentSchema>;

/**
 * Starting a payment names only the booking. The amount is whatever the work
 * came to, worked out on the server: a client that could name its own price
 * would be a hole big enough to drive a car through.
 */
export const initializePaymentSchema = z.object({
  serviceRequestId: z.uuid(),
});
export type InitializePayment = z.infer<typeof initializePaymentSchema>;

export const initializePaymentResponseSchema = z.object({
  /** Where to send the customer to pay. */
  authorizationUrl: z.string(),
  payment: paymentSchema,
});
export type InitializePaymentResponse = z.infer<typeof initializePaymentResponseSchema>;

export const paymentResponseSchema = z.object({ payment: paymentSchema });

export const paymentListQuerySchema = paginationQuerySchema.extend({
  serviceRequestId: z.uuid().optional(),
  status: paymentStatusSchema.optional(),
});
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;

export const paymentListResponseSchema = z.object({
  data: z.array(paymentSchema),
  /** Everything successfully taken across the rows in this response. */
  totalPaid: moneySchema,
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type PaymentListResponse = z.infer<typeof paymentListResponseSchema>;

export const PAYMENT_METHOD_LABELS: Readonly<Record<string, string>> = {
  PAYSTACK: "Card or bank",
  MOMO: "Mobile money",
  CASH: "Cash",
};

export const PAYMENT_STATUS_LABELS: Readonly<Record<string, string>> = {
  PENDING: "Not paid yet",
  SUCCESS: "Paid",
  FAILED: "Payment failed",
};

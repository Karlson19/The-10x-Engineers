import {
  type InitializePaymentResponse,
  type Payment,
  type PaymentListResponse,
  initializePaymentResponseSchema,
  paymentListResponseSchema,
  paymentResponseSchema,
} from "@chrysmec/shared";
import { apiRequest } from "./client";

/** Starts a payment and returns where to send the customer to make it. */
export function initializePayment(serviceRequestId: string): Promise<InitializePaymentResponse> {
  return apiRequest("/payments/initialize", initializePaymentResponseSchema, {
    method: "POST",
    body: { serviceRequestId },
  });
}

/**
 * Asks the server to check with Paystack what actually happened. Called when
 * the customer lands back from checkout, because the redirect on its own
 * proves nothing.
 */
export async function confirmPayment(reference: string): Promise<Payment> {
  const result = await apiRequest(
    `/payments/${encodeURIComponent(reference)}/confirm`,
    paymentResponseSchema,
  );
  return result.payment;
}

export function fetchPayments(serviceRequestId?: string): Promise<PaymentListResponse> {
  const query = serviceRequestId ? `?serviceRequestId=${serviceRequestId}&limit=50` : "?limit=50";
  return apiRequest(`/payments${query}`, paymentListResponseSchema);
}

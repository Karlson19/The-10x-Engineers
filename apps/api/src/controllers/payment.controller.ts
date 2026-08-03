import type { RequestHandler } from "express";
import { z } from "zod";
import { initializePaymentSchema, paymentListQuerySchema } from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import { isValidWebhookSignature } from "../lib/paystack";
import { logger } from "../lib/logger";
import {
  initializePayment,
  listPayments,
  settlePayment,
} from "../services/payment.service";

export const initialize: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const input = initializePaymentSchema.parse(req.body);

  res.status(201).json(await initializePayment(user, input.serviceRequestId));
};

export const list: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const query = paymentListQuerySchema.parse(req.query);

  res.status(200).json(await listPayments(user, query));
};

/**
 * Called when the customer comes back from checkout. The redirect itself
 * proves nothing, so this asks Paystack what actually happened.
 */
export const confirm: RequestHandler = async (req, res) => {
  requireAuthUser(req);
  const { reference } = z.object({ reference: z.string().min(1).max(120) }).parse(req.params);

  res.status(200).json({ payment: await settlePayment(reference) });
};

const webhookEventSchema = z.object({
  event: z.string(),
  data: z.object({ reference: z.string() }).partial().optional(),
});

/**
 * Paystack's own callback, and the one that actually decides a payment landed.
 *
 * Unauthenticated by necessity, so the signature is the only thing standing
 * between this and anyone who knows the URL. It is checked against the raw
 * bytes before the body is trusted for anything.
 *
 * Always answers 200 once the signature is good. Paystack retries on anything
 * else, and a payment we have already settled is not a failure worth retrying.
 */
export const webhook: RequestHandler = async (req, res) => {
  const { rawBody } = req;

  if (!rawBody || !isValidWebhookSignature(rawBody, req.get("x-paystack-signature"))) {
    logger.error("Rejected a webhook with a bad or missing signature");
    res.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Bad signature." },
    });
    return;
  }

  const parsed = webhookEventSchema.safeParse(req.body);
  const reference = parsed.success ? parsed.data.data?.reference : undefined;

  if (!parsed.success || !reference) {
    res.status(200).json({ received: true });
    return;
  }

  if (parsed.data.event !== "charge.success") {
    // Every other event is noise to this product.
    res.status(200).json({ received: true });
    return;
  }

  try {
    await settlePayment(reference);
  } catch (error) {
    // Swallowed on purpose: Paystack must not retry forever because of a
    // reference that means nothing to us.
    logger.error({ err: error, reference }, "Could not settle a payment from the webhook");
  }

  res.status(200).json({ received: true });
};

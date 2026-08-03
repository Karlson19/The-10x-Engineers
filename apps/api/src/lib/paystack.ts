import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env";
import { HttpError } from "./http-error";
import { logger } from "./logger";

/**
 * The Paystack calls this product actually makes: start a payment, and check
 * afterwards what really happened to it.
 *
 * Deliberately thin and hand rolled rather than pulling in an SDK. Two POSTs
 * and a GET do not justify a dependency, and the secret key must never leave
 * this file's reach.
 */

const PAYSTACK_BASE = "https://api.paystack.co";

/** Paystack works in the minor unit, so GHS 450.00 is 45000 pesewas. */
export function toMinorUnit(amount: string): number {
  return Math.round(Number.parseFloat(amount) * 100);
}

export function isPaystackConfigured(): boolean {
  return env.PAYSTACK_SECRET_KEY.length > 0;
}

const initializeResponseSchema = z.object({
  status: z.boolean(),
  message: z.string().optional(),
  data: z
    .object({
      authorization_url: z.string(),
      access_code: z.string().optional(),
      reference: z.string(),
    })
    .optional(),
});

const verifyResponseSchema = z.object({
  status: z.boolean(),
  message: z.string().optional(),
  data: z
    .object({
      status: z.string(),
      reference: z.string(),
      amount: z.number(),
      currency: z.string().optional(),
    })
    .optional(),
});

async function paystack(path: string, init?: RequestInit): Promise<unknown> {
  if (!isPaystackConfigured()) {
    throw HttpError.badRequest(
      "Card payments are not switched on for this workshop yet.",
      { payment: "No payment key is configured." },
    );
  }

  let response: Response;

  try {
    response = await fetch(`${PAYSTACK_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    logger.error({ err: error, path }, "Could not reach Paystack");
    throw HttpError.badGateway("We could not reach the payment provider. Try again in a moment.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // Never log the body wholesale: it echoes back parts of the request.
    logger.error({ path, status: response.status }, "Paystack rejected the request");
    throw HttpError.badGateway("The payment provider refused that. Try again in a moment.");
  }

  return body;
}

export async function initializeTransaction(input: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  currency: string;
}): Promise<{ authorizationUrl: string }> {
  const parsed = initializeResponseSchema.safeParse(
    await paystack("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: input.amountMinor,
        reference: input.reference,
        callback_url: input.callbackUrl,
        currency: input.currency,
      }),
    }),
  );

  if (!parsed.success || !parsed.data.status || !parsed.data.data) {
    throw HttpError.badGateway("The payment provider did not start that payment.");
  }

  return { authorizationUrl: parsed.data.data.authorization_url };
}

export type PaystackVerification = {
  /** Paystack's own word for it. Only "success" means the money arrived. */
  status: string;
  amountMinor: number;
};

export async function verifyTransaction(reference: string): Promise<PaystackVerification> {
  const parsed = verifyResponseSchema.safeParse(
    await paystack(`/transaction/verify/${encodeURIComponent(reference)}`),
  );

  if (!parsed.success || !parsed.data.status || !parsed.data.data) {
    throw HttpError.badGateway("The payment provider could not confirm that payment.");
  }

  return {
    status: parsed.data.data.status,
    amountMinor: parsed.data.data.amount,
  };
}

/**
 * Paystack signs every webhook with an HMAC of the raw body under the secret
 * key. Verified against the raw bytes, because re-serialising the parsed JSON
 * would change the signature, and compared in constant time so the comparison
 * itself cannot be used to guess it.
 */
export function isValidWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!isPaystackConfigured() || !signature) {
    return false;
  }

  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const provided = Buffer.from(signature, "utf8");
  const computed = Buffer.from(expected, "utf8");

  if (provided.length !== computed.length) {
    return false;
  }

  return timingSafeEqual(provided, computed);
}

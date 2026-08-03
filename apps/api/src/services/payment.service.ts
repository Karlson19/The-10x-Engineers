import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  type InitializePaymentResponse,
  type PaginationMeta,
  type Payment,
  type PaymentListQuery,
  referenceFromId,
} from "@chrysmec/shared";
import { env } from "../config/env";
import { HttpError } from "../lib/http-error";
import { logger } from "../lib/logger";
import {
  initializeTransaction,
  toMinorUnit,
  verifyTransaction,
} from "../lib/paystack";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";

type PaymentRow = {
  id: string;
  serviceRequestId: string;
  amount: Prisma.Decimal;
  currency: string;
  method: "PAYSTACK" | "MOMO" | "CASH";
  status: "PENDING" | "SUCCESS" | "FAILED";
  reference: string;
  createdAt: Date;
};

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    serviceRequestId: row.serviceRequestId,
    requestReference: referenceFromId(row.serviceRequestId),
    amount: row.amount.toFixed(2),
    currency: row.currency,
    method: row.method,
    status: row.status,
    reference: row.reference,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Ours, not Paystack's, so it is stable even if a payment is retried. */
function newReference(): string {
  return `CHR-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * What the customer owes: every part and hour logged against the job.
 *
 * Worked out here and never taken from the request. A client that could name
 * its own amount could pay one pesewa for a gearbox.
 */
async function amountDueFor(serviceRequestId: string): Promise<Prisma.Decimal> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: { job: { include: { workLog: true } } },
  });

  if (!request?.job) {
    return new Prisma.Decimal(0);
  }

  return request.job.workLog.reduce(
    (total, line) => total.add(line.unitCost.mul(line.quantity)),
    new Prisma.Decimal(0),
  );
}

/** Everything already taken against a booking, so nobody is charged twice. */
async function alreadyPaid(serviceRequestId: string): Promise<Prisma.Decimal> {
  const rows = await prisma.payment.findMany({
    where: { serviceRequestId, status: "SUCCESS" },
  });

  return rows.reduce((total, row) => total.add(row.amount), new Prisma.Decimal(0));
}

export async function initializePayment(
  user: AuthenticatedUser,
  serviceRequestId: string,
): Promise<InitializePaymentResponse> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: { client: true },
  });

  if (!request) {
    throw HttpError.notFound("We could not find that booking.");
  }

  // Only the customer whose booking it is may pay for it.
  if (user.role === "CLIENT" && request.clientId !== user.id) {
    throw HttpError.notFound("We could not find that booking.");
  }

  if (request.status !== "COMPLETED") {
    throw HttpError.conflict(
      "This booking is not finished yet, so there is nothing to settle.",
    );
  }

  const due = await amountDueFor(serviceRequestId);
  const paid = await alreadyPaid(serviceRequestId);
  const outstanding = due.sub(paid);

  if (outstanding.lessThanOrEqualTo(0)) {
    throw HttpError.conflict("This booking has already been paid in full.");
  }

  const reference = newReference();

  const payment = await prisma.payment.create({
    data: {
      serviceRequestId,
      amount: outstanding,
      currency: "GHS",
      method: "PAYSTACK",
      status: "PENDING",
      reference,
    },
  });

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: request.client.email,
      amountMinor: toMinorUnit(outstanding.toFixed(2)),
      reference,
      currency: "GHS",
      callbackUrl: `${env.CORS_ORIGIN}/dashboard/requests/${serviceRequestId}?paid=1`,
    });

    return { authorizationUrl, payment: toPayment(payment) };
  } catch (error) {
    // The provider never took it, so the row should not sit pending forever.
    await prisma.payment
      .update({ where: { id: payment.id }, data: { status: "FAILED" } })
      .catch((updateError: unknown) => {
        logger.error({ err: updateError }, "Could not mark the payment failed");
      });

    throw error;
  }
}

/**
 * Settles a payment against what the provider actually says happened.
 *
 * Used by both the webhook and the customer coming back from checkout, and
 * safe to run repeatedly: a payment already marked successful is left alone
 * rather than notified about twice.
 */
export async function settlePayment(reference: string): Promise<Payment> {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { serviceRequest: true },
  });

  if (!payment) {
    throw HttpError.notFound("We could not find that payment.");
  }

  if (payment.status === "SUCCESS") {
    return toPayment(payment);
  }

  const verification = await verifyTransaction(reference);
  const succeeded = verification.status === "success";

  // Never trust the amount that comes back on a redirect. If it does not match
  // what we asked for, something is wrong and it is not a successful payment.
  const expectedMinor = toMinorUnit(payment.amount.toFixed(2));
  const amountMatches = verification.amountMinor === expectedMinor;

  if (succeeded && !amountMatches) {
    logger.error(
      { reference, expectedMinor, received: verification.amountMinor },
      "Paystack reported a different amount to the one requested",
    );
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: succeeded && amountMatches ? "SUCCESS" : "FAILED" },
  });

  if (updated.status === "SUCCESS") {
    await prisma.notification
      .create({
        data: {
          userId: payment.serviceRequest.clientId,
          title: `Payment received for ${referenceFromId(payment.serviceRequestId)}`,
          body: `We have your payment of GHS ${payment.amount.toFixed(2)}. Your receipt is on the booking.`,
        },
      })
      .catch((error: unknown) => {
        logger.error({ err: error }, "Could not write the payment notification");
      });
  }

  return toPayment(updated);
}

export async function listPayments(
  user: AuthenticatedUser,
  query: PaymentListQuery,
): Promise<{ data: Payment[]; totalPaid: string; meta: PaginationMeta }> {
  const where: Prisma.PaymentWhereInput = {};

  // A customer sees only what they paid. Staff have no business here at all,
  // which the route enforces; management sees everything.
  if (user.role === "CLIENT") {
    where.serviceRequest = { clientId: user.id };
  }
  if (query.serviceRequestId) {
    where.serviceRequestId = query.serviceRequestId;
  }
  if (query.status) {
    where.status = query.status;
  }

  const [total, rows, paidAggregate] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.payment.aggregate({
      where: { ...where, status: "SUCCESS" },
      _sum: { amount: true },
    }),
  ]);

  return {
    data: rows.map(toPayment),
    totalPaid: (paidAggregate._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

/** What is still owed on a booking, for the pay button to decide what to show. */
export async function outstandingFor(serviceRequestId: string): Promise<string> {
  const [due, paid] = await Promise.all([
    amountDueFor(serviceRequestId),
    alreadyPaid(serviceRequestId),
  ]);

  const outstanding = due.sub(paid);
  return outstanding.lessThan(0) ? "0.00" : outstanding.toFixed(2);
}

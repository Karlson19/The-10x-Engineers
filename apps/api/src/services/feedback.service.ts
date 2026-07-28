import { Prisma } from "@prisma/client";
import type { CreateFeedback, Feedback } from "@chrysmec/shared";
import { referenceFromId } from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";

function toFeedback(row: {
  id: string;
  serviceRequestId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}): Feedback {
  return {
    id: row.id,
    serviceRequestId: row.serviceRequestId,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Only the customer whose vehicle it was, and only once the work is finished.
 * Rating a job that has not happened yet would make the quality signal
 * meaningless.
 */
export async function createFeedback(
  user: AuthenticatedUser,
  serviceRequestId: string,
  input: CreateFeedback,
): Promise<Feedback> {
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: { job: true },
  });

  if (!serviceRequest || serviceRequest.clientId !== user.id) {
    throw HttpError.notFound("We could not find that service request.");
  }

  if (serviceRequest.status !== "COMPLETED") {
    throw HttpError.conflict("You can leave feedback once the work is finished.");
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        serviceRequestId,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      },
    });

    // Tell the technician who did the work, and management if it was poor.
    if (serviceRequest.job) {
      await prisma.notification
        .create({
          data: {
            userId: serviceRequest.job.assignedStaffId,
            title: `${input.rating} star rating on ${referenceFromId(serviceRequestId)}`,
            body: input.comment?.trim() || "No comment left.",
          },
        })
        .catch((error: unknown) => {
          logger.error({ err: error }, "Could not notify staff about feedback");
        });
    }

    return toFeedback(feedback);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw HttpError.conflict("You have already left feedback for this job.");
    }
    throw error;
  }
}

export async function getFeedback(
  user: AuthenticatedUser,
  serviceRequestId: string,
): Promise<Feedback | null> {
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: { feedback: true },
  });

  if (!serviceRequest) {
    throw HttpError.notFound("We could not find that service request.");
  }

  // A client sees their own, staff and management see any.
  if (user.role === "CLIENT" && serviceRequest.clientId !== user.id) {
    throw HttpError.notFound("We could not find that service request.");
  }

  return serviceRequest.feedback ? toFeedback(serviceRequest.feedback) : null;
}

import { Prisma } from "@prisma/client";
import {
  type CreateServiceRequest,
  type PaginationMeta,
  REQUEST_STATUS_LABELS,
  type RequestStatus,
  type ServiceRequest,
  type ServiceRequestListQuery,
  type StatusEvent,
  type UpdateServiceRequest,
  type UpdateStatusRequest,
  canTransition,
  clientMayTransition,
  referenceFromId,
  STATUS_TRANSITIONS,
} from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { logger } from "../lib/logger";
import { TRANSACTION_OPTIONS, prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";
import { serviceRequestInclude, toServiceRequest, toStatusEvent } from "./mappers";

export type CreateResult = { serviceRequest: ServiceRequest; created: boolean };

/**
 * In app notifications are a courtesy, not part of the record. One failing must
 * never take a booking or a status change down with it.
 */
async function notify(userId: string, title: string, body: string): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, title, body } });
  } catch (error) {
    logger.error({ err: error, userId }, "Could not write notification");
  }
}

/**
 * Who may see which requests. A client sees their own, a technician sees the
 * ones in their own section, management sees everything. Applied as a database
 * filter rather than a check after loading, so a list can never leak a row.
 */
function scopeFor(
  user: AuthenticatedUser,
  query?: ServiceRequestListQuery,
): Prisma.ServiceRequestWhereInput {
  const where: Prisma.ServiceRequestWhereInput = {};

  if (user.role === "CLIENT") {
    where.clientId = user.id;
  } else if (user.role === "STAFF") {
    // A technician without a section has no section to see, which is correct.
    where.section = user.section ?? undefined;
    if (!user.section) {
      where.id = "";
    }
  }

  if (query?.status) {
    where.status = query.status;
  }
  if (query?.section && user.role !== "STAFF") {
    where.section = query.section;
  }
  if (query?.vehicleId) {
    where.vehicleId = query.vehicleId;
  }
  if (query?.search) {
    where.OR = [
      { vehicle: { registrationNo: { contains: query.search, mode: "insensitive" } } },
      { client: { fullName: { contains: query.search, mode: "insensitive" } } },
      { client: { phone: { contains: query.search } } },
      { locationText: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

/** Loads a request the user is allowed to see, or answers 404. */
async function findVisible(user: AuthenticatedUser, id: string) {
  const request = await prisma.serviceRequest.findFirst({
    where: { AND: [{ id }, scopeFor(user)] },
    include: serviceRequestInclude,
  });

  if (!request) {
    throw HttpError.notFound("We could not find that service request.");
  }

  return request;
}

async function assertVehicleBelongsToClient(vehicleId: string, clientId: string): Promise<void> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });

  if (!vehicle || vehicle.ownerId !== clientId) {
    throw HttpError.badRequest("Choose one of your own vehicles.", {
      vehicleId: "That vehicle is not on your list.",
    });
  }
}

async function resolveCatalogueItems(ids: string[], section: string): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }

  const unique = [...new Set(ids)];
  const items = await prisma.serviceCatalogItem.findMany({
    where: { id: { in: unique }, isActive: true },
  });

  if (items.length !== unique.length) {
    throw HttpError.badRequest("One of the services you chose is no longer available.", {
      serviceCatalogItemIds: "Go back and choose again.",
    });
  }

  if (items.some((item) => item.section !== section)) {
    throw HttpError.badRequest("One of the services you chose belongs to the other section.", {
      serviceCatalogItemIds: "Go back and choose again.",
    });
  }

  return unique;
}

/**
 * Creating a booking is idempotent on clientRequestId. A booking made in
 * airplane mode and flushed twice by the outbox returns the original record
 * the second time rather than creating a duplicate.
 */
export async function createServiceRequest(
  user: AuthenticatedUser,
  input: CreateServiceRequest,
): Promise<CreateResult> {
  const existing = await prisma.serviceRequest.findUnique({
    where: { clientRequestId: input.clientRequestId },
    include: serviceRequestInclude,
  });

  if (existing) {
    if (existing.clientId !== user.id) {
      throw HttpError.conflict("That booking reference is already in use.");
    }
    return { serviceRequest: toServiceRequest(existing), created: false };
  }

  await assertVehicleBelongsToClient(input.vehicleId, user.id);
  const catalogueIds = await resolveCatalogueItems(input.serviceCatalogItemIds, input.section);

  try {
    // The booking, its services and its first timeline entry are one unit: a
    // request that exists without a timeline would be wrong. The notification
    // is deliberately outside, because failing to post one must never lose a
    // customer's booking.
    const created = await prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.create({
        data: {
          clientId: user.id,
          vehicleId: input.vehicleId,
          section: input.section,
          status: "SUBMITTED",
          preferredDateTime: new Date(input.preferredDateTime),
          locationText: input.locationText,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          symptomCategory: input.symptomCategory,
          symptomDetails: input.symptomDetails,
          clientRequestId: input.clientRequestId,
          requestedServices: {
            create: catalogueIds.map((serviceCatalogItemId) => ({ serviceCatalogItemId })),
          },
        },
        include: serviceRequestInclude,
      });

      await tx.statusEvent.create({
        data: {
          serviceRequestId: request.id,
          fromStatus: null,
          toStatus: "SUBMITTED",
          note: "Booking received from the customer.",
        },
      });

      return request;
    }, TRANSACTION_OPTIONS);

    await notify(user.id, "Booking received", `We have your booking ${referenceFromId(created.id)}. We will confirm a slot shortly.`);

    return { serviceRequest: toServiceRequest(created), created: true };
  } catch (error) {
    // Two flushes of the same queued booking can arrive at once. The unique
    // constraint settles it and the loser returns the winner's record.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.serviceRequest.findUnique({
        where: { clientRequestId: input.clientRequestId },
        include: serviceRequestInclude,
      });

      if (raced) {
        return { serviceRequest: toServiceRequest(raced), created: false };
      }
    }
    throw error;
  }
}

export async function listServiceRequests(
  user: AuthenticatedUser,
  query: ServiceRequestListQuery,
): Promise<{ data: ServiceRequest[]; meta: PaginationMeta }> {
  const where = scopeFor(user, query);

  const [total, requests] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      include: serviceRequestInclude,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    data: requests.map(toServiceRequest),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getServiceRequest(
  user: AuthenticatedUser,
  id: string,
): Promise<ServiceRequest> {
  return toServiceRequest(await findVisible(user, id));
}

/** The owner may correct their booking, but only while nothing has happened yet. */
export async function updateServiceRequest(
  user: AuthenticatedUser,
  id: string,
  input: UpdateServiceRequest,
): Promise<ServiceRequest> {
  const existing = await findVisible(user, id);

  if (user.role !== "MANAGEMENT" && existing.clientId !== user.id) {
    throw HttpError.notFound("We could not find that service request.");
  }

  if (existing.status !== "SUBMITTED") {
    throw HttpError.conflict(
      "This booking has already been scheduled, so it can no longer be edited. Call the workshop to change it.",
    );
  }

  if (input.vehicleId !== undefined) {
    await assertVehicleBelongsToClient(input.vehicleId, existing.clientId);
  }

  const catalogueIds =
    input.serviceCatalogItemIds === undefined
      ? undefined
      : await resolveCatalogueItems(input.serviceCatalogItemIds, existing.section);

  const data: Prisma.ServiceRequestUpdateInput = {};
  if (input.vehicleId !== undefined) {
    data.vehicle = { connect: { id: input.vehicleId } };
  }
  if (input.preferredDateTime !== undefined) {
    data.preferredDateTime = new Date(input.preferredDateTime);
  }
  if (input.locationText !== undefined) {
    data.locationText = input.locationText;
  }
  if (input.latitude !== undefined) {
    data.latitude = input.latitude;
  }
  if (input.longitude !== undefined) {
    data.longitude = input.longitude;
  }
  if (input.symptomCategory !== undefined) {
    data.symptomCategory = input.symptomCategory;
  }
  if (input.symptomDetails !== undefined) {
    data.symptomDetails = input.symptomDetails;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (catalogueIds !== undefined) {
      await tx.requestedService.deleteMany({ where: { serviceRequestId: id } });
      await tx.requestedService.createMany({
        data: catalogueIds.map((serviceCatalogItemId) => ({
          serviceRequestId: id,
          serviceCatalogItemId,
        })),
      });
    }

    return tx.serviceRequest.update({ where: { id }, data, include: serviceRequestInclude });
  }, TRANSACTION_OPTIONS);

  return toServiceRequest(updated);
}

/**
 * The transition rules are enforced here and nowhere else. The client mirrors
 * them to decide which buttons to offer, but this is what actually decides.
 */
export async function updateServiceRequestStatus(
  user: AuthenticatedUser,
  id: string,
  input: UpdateStatusRequest,
): Promise<ServiceRequest> {
  const existing = await findVisible(user, id);
  const from: RequestStatus = existing.status;
  const to = input.status;

  // A customer may only answer an estimate on their own booking: approve it and
  // work continues, or decline it and the booking is cancelled. Everything else
  // is the workshop's to move.
  if (user.role === "CLIENT") {
    if (existing.clientId !== user.id) {
      throw HttpError.notFound("We could not find that service request.");
    }
    if (!clientMayTransition(from, to)) {
      throw HttpError.forbidden(
        "Only the workshop can move a booking. You can approve or decline an estimate when we send one.",
      );
    }
  }

  if (from === to) {
    throw HttpError.invalidTransition(
      `This booking is already ${REQUEST_STATUS_LABELS[to].toLowerCase()}.`,
      { status: "Choose a different status." },
    );
  }

  if (!canTransition(from, to)) {
    const allowed = STATUS_TRANSITIONS[from];
    throw HttpError.invalidTransition(
      allowed.length === 0
        ? `A booking that is ${REQUEST_STATUS_LABELS[from].toLowerCase()} cannot change again.`
        : `A booking cannot go from ${REQUEST_STATUS_LABELS[from].toLowerCase()} to ${REQUEST_STATUS_LABELS[to].toLowerCase()}.`,
      { from, to, allowed: [...allowed] },
    );
  }

  if (input.estimatedCost !== undefined && user.role === "CLIENT") {
    throw HttpError.forbidden("Only the workshop can set an estimate.");
  }

  // The estimate is what the customer is being asked to approve, so it is
  // recorded in the same operation as the move to awaiting approval.
  const data: Prisma.ServiceRequestUpdateInput = { status: to };
  if (input.estimatedCost !== undefined) {
    data.estimatedCost = new Prisma.Decimal(input.estimatedCost);
  }

  const noteForEvent =
    input.note ??
    (to === "AWAITING_APPROVAL" && input.estimatedCost !== undefined
      ? `Estimate of GHS ${input.estimatedCost} sent for approval.`
      : null);

  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.update({
      where: { id },
      data,
      include: serviceRequestInclude,
    });

    await tx.statusEvent.create({
      data: {
        serviceRequestId: id,
        fromStatus: from,
        toStatus: to,
        note: noteForEvent,
      },
    });

    return request;
  }, TRANSACTION_OPTIONS);

  // When the workshop moves a booking the customer wants to know. When the
  // customer answers an estimate, the technician waiting on them is the one
  // who needs telling.
  if (user.role === "CLIENT" && updated.job) {
    await notify(
      updated.job.assignedStaffId,
      `${referenceFromId(id)} estimate ${to === "IN_PROGRESS" ? "approved" : "declined"}`,
      `${updated.client.fullName} has ${to === "IN_PROGRESS" ? "approved the estimate, so work can continue" : "declined the estimate"}.`,
    );
  } else if (user.role !== "CLIENT") {
    await notify(
      updated.clientId,
      `${referenceFromId(id)} is now ${REQUEST_STATUS_LABELS[to].toLowerCase()}`,
      noteForEvent ??
        `Your ${updated.vehicle.make} ${updated.vehicle.model} has moved to ${REQUEST_STATUS_LABELS[to].toLowerCase()}.`,
    );
  }

  return toServiceRequest(updated);
}

/**
 * Only removable while nothing has happened yet. Once a booking has been
 * scheduled it is part of the record and is cancelled through the status
 * route instead, which keeps the timeline intact.
 */
export async function deleteServiceRequest(user: AuthenticatedUser, id: string): Promise<void> {
  const existing = await findVisible(user, id);

  if (user.role === "STAFF") {
    throw HttpError.forbidden("Only the customer or management can remove a booking.");
  }

  if (user.role === "CLIENT" && existing.status !== "SUBMITTED") {
    throw HttpError.conflict(
      "This booking has already been scheduled. Cancel it instead so the history is kept.",
    );
  }

  await prisma.serviceRequest.delete({ where: { id } });
}

export async function getTimeline(user: AuthenticatedUser, id: string): Promise<StatusEvent[]> {
  await findVisible(user, id);

  const events = await prisma.statusEvent.findMany({
    where: { serviceRequestId: id },
    orderBy: { createdAt: "asc" },
  });

  return events.map(toStatusEvent);
}

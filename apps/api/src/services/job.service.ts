import { Prisma } from "@prisma/client";
import {
  type CreateJob,
  type CreateWorkLogEntry,
  type Job,
  type JobListQuery,
  type PaginationMeta,
  type UpdateJob,
  type WorkLogEntry,
  referenceFromId,
} from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { logger } from "../lib/logger";
import { TRANSACTION_OPTIONS, prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";
import { jobInclude, money, toJob, toWorkLogEntry, workLogTotal } from "./mappers";

const { Decimal } = Prisma;

async function notify(userId: string, title: string, body: string): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, title, body } });
  } catch (error) {
    logger.error({ err: error, userId }, "Could not write notification");
  }
}

/**
 * A technician sees the jobs assigned to them. Management sees all of them.
 * A client has no route here at all: they follow their vehicle through the
 * status timeline instead.
 */
function scopeFor(user: AuthenticatedUser, query?: JobListQuery): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = {};

  if (user.role === "STAFF") {
    where.assignedStaffId = user.id;
  } else if (query?.assignedStaffId) {
    where.assignedStaffId = query.assignedStaffId;
  }

  if (query?.status === "OPEN") {
    // Everything still on the workshop floor.
    where.status = { in: ["ASSIGNED", "IN_PROGRESS"] };
  } else if (query?.status) {
    where.status = query.status;
  }

  // Filters that live on the booking rather than the job itself.
  const requestFilter: Prisma.ServiceRequestWhereInput = {};

  if (query?.section) {
    requestFilter.section = query.section;
  }

  if (query?.scheduledFor === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    requestFilter.preferredDateTime = { gte: start, lt: end };
  } else if (query?.scheduledFor === "upcoming") {
    requestFilter.preferredDateTime = { gte: new Date() };
  }

  if (Object.keys(requestFilter).length > 0) {
    where.serviceRequest = requestFilter;
  }

  return where;
}

async function findVisible(user: AuthenticatedUser, id: string) {
  const job = await prisma.job.findFirst({
    where: { AND: [{ id }, scopeFor(user)] },
    include: jobInclude,
  });

  if (!job) {
    throw HttpError.notFound("We could not find that job.");
  }

  return job;
}

export async function listJobs(
  user: AuthenticatedUser,
  query: JobListQuery,
): Promise<{ data: Job[]; meta: PaginationMeta }> {
  const where = scopeFor(user, query);

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      include: jobInclude,
      // The queue is read in the order the vehicles are expected.
      orderBy: { serviceRequest: { preferredDateTime: "asc" } },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    data: jobs.map(toJob),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getJob(user: AuthenticatedUser, id: string): Promise<Job> {
  return toJob(await findVisible(user, id));
}

/**
 * Management assigns a booking to a technician. The technician has to work in
 * the section the booking was made under, otherwise the section scoping that
 * protects the rest of the API would be meaningless.
 */
export async function createJob(input: CreateJob): Promise<Job> {
  const [serviceRequest, staff] = await Promise.all([
    prisma.serviceRequest.findUnique({
      where: { id: input.serviceRequestId },
      include: { job: true },
    }),
    prisma.user.findUnique({ where: { id: input.assignedStaffId } }),
  ]);

  if (!serviceRequest) {
    throw HttpError.notFound("We could not find that service request.");
  }
  if (serviceRequest.job) {
    throw HttpError.conflict("That booking already has a technician assigned.");
  }
  if (serviceRequest.status === "COMPLETED" || serviceRequest.status === "CANCELLED") {
    throw HttpError.conflict("That booking is closed, so it cannot be assigned.");
  }

  if (!staff || !staff.isActive || staff.role !== "STAFF") {
    throw HttpError.badRequest("Choose an active technician.", {
      assignedStaffId: "That person is not a technician here.",
    });
  }
  if (staff.section !== serviceRequest.section) {
    throw HttpError.badRequest("That technician works in the other section.", {
      assignedStaffId: "Choose someone from the matching section.",
    });
  }

  const shouldSchedule = input.scheduleRequest && serviceRequest.status === "SUBMITTED";

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.job.create({
      data: {
        serviceRequestId: input.serviceRequestId,
        assignedStaffId: input.assignedStaffId,
        status: "ASSIGNED",
      },
      include: jobInclude,
    });

    if (shouldSchedule) {
      await tx.serviceRequest.update({
        where: { id: input.serviceRequestId },
        data: { status: "SCHEDULED" },
      });
      await tx.statusEvent.create({
        data: {
          serviceRequestId: input.serviceRequestId,
          fromStatus: "SUBMITTED",
          toStatus: "SCHEDULED",
          note: input.note ?? `Assigned to ${staff.fullName}.`,
        },
      });
    }

    return created;
  }, TRANSACTION_OPTIONS);

  await notify(
    staff.id,
    `New job ${referenceFromId(serviceRequest.id)}`,
    `A ${serviceRequest.section.toLowerCase()} job has been assigned to you.`,
  );

  if (shouldSchedule) {
    await notify(
      serviceRequest.clientId,
      `${referenceFromId(serviceRequest.id)} is now scheduled`,
      `${staff.fullName} will be looking after your vehicle.`,
    );
  }

  // Reload so the response carries the request status the transaction just set.
  return toJob(await prisma.job.findUniqueOrThrow({ where: { id: job.id }, include: jobInclude }));
}

export async function updateJob(
  user: AuthenticatedUser,
  id: string,
  input: UpdateJob,
): Promise<Job> {
  const existing = await findVisible(user, id);

  // Only management moves a job to someone else.
  if (input.assignedStaffId !== undefined && user.role !== "MANAGEMENT") {
    throw HttpError.forbidden("Only management can reassign a job.");
  }

  const data: Prisma.JobUpdateInput = {};

  if (input.diagnosisNotes !== undefined) {
    data.diagnosisNotes = input.diagnosisNotes;
  }
  if (input.workSummary !== undefined) {
    data.workSummary = input.workSummary;
  }

  if (input.assignedStaffId !== undefined) {
    const staff = await prisma.user.findUnique({ where: { id: input.assignedStaffId } });
    if (!staff || staff.role !== "STAFF" || !staff.isActive) {
      throw HttpError.badRequest("Choose an active technician.", {
        assignedStaffId: "That person is not a technician here.",
      });
    }
    if (staff.section !== existing.serviceRequest.section) {
      throw HttpError.badRequest("That technician works in the other section.", {
        assignedStaffId: "Choose someone from the matching section.",
      });
    }
    data.assignedStaff = { connect: { id: input.assignedStaffId } };
  }

  if (input.status !== undefined && input.status !== existing.status) {
    data.status = input.status;

    // Starting and finishing a job are the moments worth stamping.
    if (input.status === "IN_PROGRESS" && !existing.startedAt) {
      data.startedAt = new Date();
    }
    if (input.status === "COMPLETED") {
      data.completedAt = new Date();
    }
  }

  const updated = await prisma.job.update({ where: { id }, data, include: jobInclude });
  return toJob(updated);
}

export async function listWorkLog(
  user: AuthenticatedUser,
  jobId: string,
): Promise<{ data: WorkLogEntry[]; total: string }> {
  await findVisible(user, jobId);

  const entries = await prisma.workLogEntry.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" },
  });

  return { data: entries.map(toWorkLogEntry), total: workLogTotal(entries) };
}

/**
 * Adding a part line and taking it out of stock is one operation. The decrement
 * is a conditional update rather than a read followed by a write, so two
 * technicians claiming the last item at the same moment cannot both succeed.
 */
export async function addWorkLogEntry(
  user: AuthenticatedUser,
  jobId: string,
  input: CreateWorkLogEntry,
): Promise<{ entry: WorkLogEntry; total: string }> {
  const job = await findVisible(user, jobId);

  if (job.status === "COMPLETED") {
    throw HttpError.conflict("This job is finished, so nothing more can be logged against it.");
  }

  const entry = await prisma.$transaction(async (tx) => {
    if (input.lineType === "LABOUR") {
      return tx.workLogEntry.create({
        data: {
          jobId,
          lineType: "LABOUR",
          description: input.description ?? "Workshop labour",
          quantity: input.quantity,
          unitCost: new Decimal(input.unitCost ?? "0"),
        },
      });
    }

    const inventoryItemId = input.inventoryItemId;
    if (!inventoryItemId) {
      throw HttpError.badRequest("Choose the part used.", {
        inventoryItemId: "Choose the part used.",
      });
    }

    const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) {
      throw HttpError.notFound("We could not find that part.");
    }

    if (item.section !== job.serviceRequest.section) {
      throw HttpError.badRequest("That part belongs to the other section.", {
        inventoryItemId: "Choose a part from your own section.",
      });
    }

    // The condition is the lock. If someone else took the stock first this
    // updates nothing and we refuse, rather than driving the count negative.
    const claimed = await tx.inventoryItem.updateMany({
      where: { id: inventoryItemId, quantityInStock: { gte: input.quantity } },
      data: { quantityInStock: { decrement: input.quantity } },
    });

    if (claimed.count === 0) {
      throw HttpError.insufficientStock(
        `There are only ${item.quantityInStock} of ${item.name} left in stock.`,
        { quantity: `Enter ${item.quantityInStock} or fewer.`, available: item.quantityInStock },
      );
    }

    return tx.workLogEntry.create({
      data: {
        jobId,
        inventoryItemId,
        lineType: "PART",
        description: input.description?.trim() || item.name,
        quantity: input.quantity,
        // Priced at what the part actually costs the workshop today.
        unitCost: item.unitCost,
      },
    });
  }, TRANSACTION_OPTIONS);

  const entries = await prisma.workLogEntry.findMany({ where: { jobId } });

  if (input.lineType === "PART" && input.inventoryItemId) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
    if (item && item.quantityInStock <= item.reorderLevel) {
      const managers = await prisma.user.findMany({
        where: { role: "MANAGEMENT", isActive: true },
        select: { id: true },
      });
      for (const manager of managers) {
        await notify(
          manager.id,
          "Low stock",
          `${item.name} (${item.sku}) is down to ${item.quantityInStock}, at or below its reorder level of ${item.reorderLevel}.`,
        );
      }
    }
  }

  return { entry: toWorkLogEntry(entry), total: workLogTotal(entries) };
}

/** Removing a mistaken part line puts the stock back. */
export async function removeWorkLogEntry(
  user: AuthenticatedUser,
  jobId: string,
  entryId: string,
): Promise<{ total: string }> {
  await findVisible(user, jobId);

  const entry = await prisma.workLogEntry.findFirst({ where: { id: entryId, jobId } });
  if (!entry) {
    throw HttpError.notFound("We could not find that work log line.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.workLogEntry.delete({ where: { id: entryId } });

    if (entry.lineType === "PART" && entry.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: entry.inventoryItemId },
        data: { quantityInStock: { increment: entry.quantity } },
      });
    }
  }, TRANSACTION_OPTIONS);

  const entries = await prisma.workLogEntry.findMany({ where: { jobId } });
  return { total: workLogTotal(entries) };
}

export { money };

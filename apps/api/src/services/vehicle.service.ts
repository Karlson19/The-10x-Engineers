import type { Prisma } from "@prisma/client";
import type {
  CreateVehicleRequest,
  PaginationMeta,
  UpdateVehicleRequest,
  Vehicle,
  VehicleListQuery,
} from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import { assertOwnership } from "../middleware/rbac";
import type { AuthenticatedUser } from "../types/auth";
import { toVehicle } from "./mappers";

const withCount = { _count: { select: { serviceRequests: true } } } as const;

/**
 * A client only ever sees their own vehicles. Management sees everything.
 * Staff read vehicle details through the service request they are working on,
 * not through this list, so they are not given a route to the whole fleet.
 */
function scopeFor(user: AuthenticatedUser, query: VehicleListQuery): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {};

  if (user.role === "CLIENT") {
    where.ownerId = user.id;
  } else if (query.ownerId) {
    where.ownerId = query.ownerId;
  }

  if (query.search) {
    where.OR = [
      { registrationNo: { contains: query.search, mode: "insensitive" } },
      { make: { contains: query.search, mode: "insensitive" } },
      { model: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listVehicles(
  user: AuthenticatedUser,
  query: VehicleListQuery,
): Promise<{ data: Vehicle[]; meta: PaginationMeta }> {
  const where = scopeFor(user, query);

  const [total, vehicles] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      include: withCount,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    data: vehicles.map(toVehicle),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getVehicle(user: AuthenticatedUser, id: string): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id }, include: withCount });

  if (!vehicle) {
    throw HttpError.notFound("We could not find that vehicle.");
  }

  assertOwnership(user, vehicle.ownerId, "We could not find that vehicle.");
  return toVehicle(vehicle);
}

export async function createVehicle(
  user: AuthenticatedUser,
  input: CreateVehicleRequest,
  ownerId?: string,
): Promise<Vehicle> {
  // Only management may add a vehicle on someone else's behalf.
  const owner = user.role === "MANAGEMENT" && ownerId ? ownerId : user.id;

  const duplicate = await prisma.vehicle.findFirst({
    where: { ownerId: owner, registrationNo: input.registrationNo },
  });

  if (duplicate) {
    throw HttpError.conflict("That registration number is already on your list of vehicles.", {
      registrationNo: "This vehicle has already been added.",
    });
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      ownerId: owner,
      make: input.make,
      model: input.model,
      year: input.year,
      registrationNo: input.registrationNo,
      notes: input.notes ?? null,
    },
    include: withCount,
  });

  return toVehicle(vehicle);
}

export async function updateVehicle(
  user: AuthenticatedUser,
  id: string,
  input: UpdateVehicleRequest,
): Promise<Vehicle> {
  const existing = await prisma.vehicle.findUnique({ where: { id } });

  if (!existing) {
    throw HttpError.notFound("We could not find that vehicle.");
  }

  assertOwnership(user, existing.ownerId, "We could not find that vehicle.");

  const data: Prisma.VehicleUpdateInput = {};
  if (input.make !== undefined) {
    data.make = input.make;
  }
  if (input.model !== undefined) {
    data.model = input.model;
  }
  if (input.year !== undefined) {
    data.year = input.year;
  }
  if (input.registrationNo !== undefined) {
    data.registrationNo = input.registrationNo;
  }
  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  const vehicle = await prisma.vehicle.update({ where: { id }, data, include: withCount });
  return toVehicle(vehicle);
}

/**
 * A vehicle with history is part of the workshop's record, so it is only
 * removable while nothing has ever been booked against it.
 */
export async function deleteVehicle(user: AuthenticatedUser, id: string): Promise<void> {
  const existing = await prisma.vehicle.findUnique({ where: { id }, include: withCount });

  if (!existing) {
    throw HttpError.notFound("We could not find that vehicle.");
  }

  assertOwnership(user, existing.ownerId, "We could not find that vehicle.");

  if (existing._count.serviceRequests > 0) {
    throw HttpError.conflict(
      "This vehicle has service history, so it cannot be removed. Update its details instead.",
    );
  }

  await prisma.vehicle.delete({ where: { id } });
}

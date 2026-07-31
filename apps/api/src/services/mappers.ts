import { Prisma } from "@prisma/client";
import type { InventoryItem, ServiceCatalogItem, Vehicle } from "@prisma/client";

const { Decimal } = Prisma;
import {
  type ServiceCatalogItem as CatalogueItemDto,
  type InventoryItem as InventoryItemDto,
  type Job as JobDto,
  type ServiceRequest as ServiceRequestDto,
  type StatusEvent as StatusEventDto,
  type Vehicle as VehicleDto,
  type VehicleSummary,
  type WorkLogEntry as WorkLogEntryDto,
  referenceFromId,
  requestStatusSchema,
  symptomAnswersSchema,
} from "@chrysmec/shared";

/**
 * Money leaves the API as a fixed two decimal string so no precision is lost in
 * JSON and the client never has to guess how many places to show.
 */
export function money(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

export function toVehicle(vehicle: Vehicle & { _count?: { serviceRequests: number } }): VehicleDto {
  return {
    id: vehicle.id,
    ownerId: vehicle.ownerId,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    registrationNo: vehicle.registrationNo,
    notes: vehicle.notes,
    createdAt: vehicle.createdAt.toISOString(),
    serviceRequestCount: vehicle._count?.serviceRequests ?? 0,
  };
}

export function toVehicleSummary(
  vehicle: Pick<Vehicle, "id" | "make" | "model" | "year" | "registrationNo">,
): VehicleSummary {
  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    registrationNo: vehicle.registrationNo,
  };
}

export function toCatalogueItem(item: ServiceCatalogItem): CatalogueItemDto {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    section: item.section,
    basePrice: money(item.basePrice),
    isActive: item.isActive,
  };
}

export function toInventoryItem(item: InventoryItem): InventoryItemDto {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    section: item.section,
    quantityInStock: item.quantityInStock,
    unitCost: money(item.unitCost),
    reorderLevel: item.reorderLevel,
    imageUrl: item.imageUrl,
    // Derived here so no screen has to remember the rule for itself.
    isLowStock: item.quantityInStock <= item.reorderLevel,
  };
}

/** Everything a service request response needs, loaded in one query. */
export const serviceRequestInclude = {
  vehicle: { select: { id: true, make: true, model: true, year: true, registrationNo: true } },
  client: { select: { id: true, fullName: true, phone: true } },
  requestedServices: { include: { serviceCatalogItem: true } },
  job: {
    include: { assignedStaff: { select: { id: true, fullName: true, section: true } } },
  },
} satisfies Prisma.ServiceRequestInclude;

export type ServiceRequestRow = Prisma.ServiceRequestGetPayload<{
  include: typeof serviceRequestInclude;
}>;

export function toServiceRequest(row: ServiceRequestRow): ServiceRequestDto {
  return {
    id: row.id,
    reference: referenceFromId(row.id),
    clientId: row.clientId,
    vehicleId: row.vehicleId,
    section: row.section,
    status: row.status,
    preferredDateTime: row.preferredDateTime.toISOString(),
    locationText: row.locationText,
    latitude: row.latitude,
    longitude: row.longitude,
    symptomCategory: row.symptomCategory,
    // The column is Json. Parsing it rather than casting keeps the response
    // honest even if a row was written by an older version of the app.
    symptomDetails: symptomAnswersSchema.catch({}).parse(row.symptomDetails),
    estimatedCost: row.estimatedCost === null ? null : money(row.estimatedCost),
    clientRequestId: row.clientRequestId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    vehicle: toVehicleSummary(row.vehicle),
    client: row.client,
    requestedServices: row.requestedServices.map((link) =>
      toCatalogueItem(link.serviceCatalogItem),
    ),
    job: row.job
      ? {
          id: row.job.id,
          status: row.job.status,
          assignedStaff: row.job.assignedStaff,
          startedAt: row.job.startedAt?.toISOString() ?? null,
          completedAt: row.job.completedAt?.toISOString() ?? null,
        }
      : null,
  };
}

export function toStatusEvent(event: {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: Date;
}): StatusEventDto {
  return {
    id: event.id,
    fromStatus: event.fromStatus === null ? null : requestStatusSchema.parse(event.fromStatus),
    toStatus: requestStatusSchema.parse(event.toStatus),
    note: event.note,
    createdAt: event.createdAt.toISOString(),
  };
}

/** Everything a job response needs, loaded in one query. */
export const jobInclude = {
  assignedStaff: { select: { id: true, fullName: true, section: true } },
  serviceRequest: {
    include: {
      vehicle: { select: { id: true, make: true, model: true, year: true, registrationNo: true } },
      client: { select: { id: true, fullName: true, phone: true } },
    },
  },
  workLog: true,
} satisfies Prisma.JobInclude;

export type JobRow = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

export function toWorkLogEntry(entry: {
  id: string;
  jobId: string;
  inventoryItemId: string | null;
  lineType: WorkLogEntryDto["lineType"];
  description: string;
  quantity: number;
  unitCost: Prisma.Decimal;
  createdAt: Date;
}): WorkLogEntryDto {
  return {
    id: entry.id,
    jobId: entry.jobId,
    inventoryItemId: entry.inventoryItemId,
    lineType: entry.lineType,
    description: entry.description,
    quantity: entry.quantity,
    unitCost: money(entry.unitCost),
    // Worked out once, on the server, so every screen shows the same number.
    lineTotal: money(entry.unitCost.mul(entry.quantity)),
    createdAt: entry.createdAt.toISOString(),
  };
}

export function workLogTotal(
  entries: ReadonlyArray<{ unitCost: Prisma.Decimal; quantity: number }>,
): string {
  return entries
    .reduce((total, entry) => total.add(entry.unitCost.mul(entry.quantity)), new Decimal(0))
    .toFixed(2);
}

export function toJob(row: JobRow): JobDto {
  return {
    id: row.id,
    serviceRequestId: row.serviceRequestId,
    reference: referenceFromId(row.serviceRequestId),
    status: row.status,
    section: row.serviceRequest.section,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    diagnosisNotes: row.diagnosisNotes,
    workSummary: row.workSummary,
    createdAt: row.createdAt.toISOString(),
    assignedStaff: row.assignedStaff,
    client: row.serviceRequest.client,
    vehicle: toVehicleSummary(row.serviceRequest.vehicle),
    preferredDateTime: row.serviceRequest.preferredDateTime.toISOString(),
    requestStatus: row.serviceRequest.status,
    symptomCategory: row.serviceRequest.symptomCategory,
    estimatedCost:
      row.serviceRequest.estimatedCost === null ? null : money(row.serviceRequest.estimatedCost),
    workLogTotal: workLogTotal(row.workLog),
  };
}

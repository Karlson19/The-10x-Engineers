import { Prisma } from "@prisma/client";
import type {
  CreateServiceCatalogItem,
  ServiceCatalogItem,
  ServiceCatalogueQuery,
  UpdateServiceCatalogItem,
} from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";
import { toCatalogueItem } from "./mappers";

const { Decimal } = Prisma;

/**
 * The catalogue behind the booking wizard's optional service picker. Only
 * management may look at retired items; everyone else sees what is bookable
 * today.
 */
export async function listCatalogue(
  user: AuthenticatedUser,
  query: ServiceCatalogueQuery,
): Promise<ServiceCatalogItem[]> {
  const where: Prisma.ServiceCatalogItemWhereInput = {};

  if (query.section) {
    where.section = query.section;
  }

  const includeInactive = user.role === "MANAGEMENT" && query.includeInactive === true;
  if (!includeInactive) {
    where.isActive = true;
  }

  const items = await prisma.serviceCatalogItem.findMany({
    where,
    orderBy: [{ section: "asc" }, { name: "asc" }],
  });

  return items.map(toCatalogueItem);
}

/**
 * The same list for a visitor who has not signed in, used by the price list on
 * the public site. A workshop's prices are public information, so this is
 * deliberate rather than a gap: it returns active items only and nothing about
 * who booked what.
 */
export async function listPublicCatalogue(): Promise<ServiceCatalogItem[]> {
  const items = await prisma.serviceCatalogItem.findMany({
    where: { isActive: true },
    orderBy: [{ section: "asc" }, { basePrice: "asc" }],
  });

  return items.map(toCatalogueItem);
}

export async function createCatalogueItem(
  input: CreateServiceCatalogItem,
): Promise<ServiceCatalogItem> {
  const item = await prisma.serviceCatalogItem.create({
    data: {
      name: input.name,
      description: input.description,
      section: input.section,
      basePrice: new Decimal(input.basePrice),
      isActive: input.isActive,
    },
  });

  return toCatalogueItem(item);
}

export async function updateCatalogueItem(
  id: string,
  input: UpdateServiceCatalogItem,
): Promise<ServiceCatalogItem> {
  const existing = await prisma.serviceCatalogItem.findUnique({ where: { id } });
  if (!existing) {
    throw HttpError.notFound("We could not find that service.");
  }

  const data: Prisma.ServiceCatalogItemUpdateInput = {};
  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.section !== undefined) {
    data.section = input.section;
  }
  if (input.basePrice !== undefined) {
    data.basePrice = new Decimal(input.basePrice);
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  return toCatalogueItem(await prisma.serviceCatalogItem.update({ where: { id }, data }));
}

/**
 * Retired rather than deleted. Past bookings reference these rows, and a
 * customer's history should still say what they asked for.
 */
export async function retireCatalogueItem(id: string): Promise<ServiceCatalogItem> {
  const existing = await prisma.serviceCatalogItem.findUnique({ where: { id } });
  if (!existing) {
    throw HttpError.notFound("We could not find that service.");
  }

  return toCatalogueItem(
    await prisma.serviceCatalogItem.update({ where: { id }, data: { isActive: false } }),
  );
}

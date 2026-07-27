import type { Prisma } from "@prisma/client";
import type { ServiceCatalogItem, ServiceCatalogueQuery } from "@chrysmec/shared";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";
import { toCatalogueItem } from "./mappers";

/**
 * The catalogue behind the booking wizard's optional service picker. Only
 * management may look at retired items; everyone else sees what is bookable
 * today. Creating and editing items arrives with the management screens.
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

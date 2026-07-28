import { Prisma } from "@prisma/client";
import type {
  CreateInventoryItem,
  InventoryItem,
  InventoryListQuery,
  PaginationMeta,
  UpdateInventoryItem,
} from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";
import { toInventoryItem } from "./mappers";

const { Decimal } = Prisma;

/**
 * A technician sees the stock for their own section, read only. Management
 * sees and edits everything.
 */
function scopeFor(user: AuthenticatedUser, query: InventoryListQuery): Prisma.InventoryItemWhereInput {
  const where: Prisma.InventoryItemWhereInput = {};

  if (user.role === "STAFF") {
    where.section = user.section ?? undefined;
    if (!user.section) {
      where.id = "";
    }
  } else if (query.section) {
    where.section = query.section;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { sku: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listInventory(
  user: AuthenticatedUser,
  query: InventoryListQuery,
): Promise<{ data: InventoryItem[]; meta: PaginationMeta }> {
  const where = scopeFor(user, query);

  // "At or below the reorder level" compares two columns, which Prisma cannot
  // express in a where clause, so the filter is applied after loading.
  const shouldFilterLowStock = query.lowStock === true;

  const rows = await prisma.inventoryItem.findMany({
    where,
    orderBy: [{ section: "asc" }, { name: "asc" }],
  });

  const items = rows
    .map(toInventoryItem)
    .filter((item) => (shouldFilterLowStock ? item.isLowStock : true));

  const start = (query.page - 1) * query.limit;

  return {
    data: items.slice(start, start + query.limit),
    meta: {
      page: query.page,
      limit: query.limit,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / query.limit)),
    },
  };
}

export async function createInventoryItem(input: CreateInventoryItem): Promise<InventoryItem> {
  try {
    const item = await prisma.inventoryItem.create({
      data: {
        name: input.name,
        sku: input.sku,
        section: input.section,
        quantityInStock: input.quantityInStock,
        unitCost: new Decimal(input.unitCost),
        reorderLevel: input.reorderLevel,
      },
    });

    return toInventoryItem(item);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw HttpError.conflict("That stock code is already in use.", {
        sku: "Choose a different stock code.",
      });
    }
    throw error;
  }
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItem,
): Promise<InventoryItem> {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) {
    throw HttpError.notFound("We could not find that part.");
  }

  const data: Prisma.InventoryItemUpdateInput = {};
  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.sku !== undefined) {
    data.sku = input.sku;
  }
  if (input.section !== undefined) {
    data.section = input.section;
  }
  if (input.quantityInStock !== undefined) {
    data.quantityInStock = input.quantityInStock;
  }
  if (input.unitCost !== undefined) {
    data.unitCost = new Decimal(input.unitCost);
  }
  if (input.reorderLevel !== undefined) {
    data.reorderLevel = input.reorderLevel;
  }

  try {
    return toInventoryItem(await prisma.inventoryItem.update({ where: { id }, data }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw HttpError.conflict("That stock code is already in use.", {
        sku: "Choose a different stock code.",
      });
    }
    throw error;
  }
}

/** Restocking is common enough to deserve its own operation. */
export async function restockInventoryItem(id: string, quantity: number): Promise<InventoryItem> {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) {
    throw HttpError.notFound("We could not find that part.");
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: { quantityInStock: { increment: quantity } },
  });

  return toInventoryItem(item);
}

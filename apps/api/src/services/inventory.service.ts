import { Prisma } from "@prisma/client";
import type {
  AdjustStock,
  CreateInventoryItem,
  InventoryItem,
  InventoryListQuery,
  PaginationMeta,
  ReceiveStock,
  StockHistoryResponse,
  UpdateInventoryItem,
} from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { TRANSACTION_OPTIONS, prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";
import { toInventoryItem, toStockMovement } from "./mappers";
import { postMovement } from "./stock-ledger";

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

export async function createInventoryItem(
  input: CreateInventoryItem,
  recordedById?: string,
): Promise<InventoryItem> {
  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({
        data: {
          name: input.name,
          sku: input.sku,
          section: input.section,
          // Starts empty and is put on the shelf by the opening movement below,
          // so the very first stock this part ever had is on the ledger like
          // everything after it.
          quantityInStock: 0,
          unitCost: new Decimal(input.unitCost),
          reorderLevel: input.reorderLevel,
          imageUrl: input.imageUrl ?? null,
        },
      });

      if (input.quantityInStock > 0) {
        await postMovement(tx, {
          inventoryItemId: created.id,
          type: "RECEIPT",
          quantity: input.quantityInStock,
          unitCost: new Decimal(input.unitCost),
          note: "Opening stock",
          supplier: input.supplier ?? null,
          reference: input.reference ?? null,
          recordedById: recordedById ?? null,
        });
      }

      return tx.inventoryItem.findUniqueOrThrow({ where: { id: created.id } });
    }, TRANSACTION_OPTIONS);

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
  /*
    The count and the cost are deliberately not editable here. They are the
    result of what has been received and used, so typing over them would put
    the item and its ledger out of step with no record of why. Stock arrives
    through receiveStock, which takes the price paid, and a stock take
    correction goes through adjustStock, which takes a reason.
  */
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

/**
 * Stock arriving from a supplier.
 *
 * This used to take a quantity and nothing else, so what the workshop paid was
 * never recorded anywhere and the price of a part over time could not be
 * answered at all. It now takes the price, and optionally who it came from and
 * the invoice it came on, and that is what builds the price history.
 */
export async function receiveStock(
  id: string,
  input: ReceiveStock,
  recordedById?: string,
): Promise<InventoryItem> {
  const item = await prisma.$transaction(async (tx) => {
    await postMovement(tx, {
      inventoryItemId: id,
      type: "RECEIPT",
      quantity: input.quantity,
      unitCost: new Decimal(input.unitCost),
      supplier: input.supplier ?? null,
      reference: input.reference ?? null,
      note: input.note ?? null,
      recordedById: recordedById ?? null,
    });

    return tx.inventoryItem.findUniqueOrThrow({ where: { id } });
  }, TRANSACTION_OPTIONS);

  return toInventoryItem(item);
}

/**
 * A stock take correction, breakage or write off.
 *
 * The count is only ever wrong because something happened that nobody wrote
 * down, so this insists on a reason. The correction is posted as its own
 * movement rather than by editing the number, which means the discrepancy
 * itself stays visible instead of being quietly tidied away.
 */
export async function adjustStock(
  id: string,
  input: AdjustStock,
  recordedById?: string,
): Promise<InventoryItem> {
  const item = await prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      throw HttpError.notFound("We could not find that part.");
    }

    const difference = input.countedQuantity - existing.quantityInStock;

    if (difference === 0) {
      return existing;
    }

    await postMovement(tx, {
      inventoryItemId: id,
      type: "ADJUSTMENT",
      quantity: difference,
      note: input.reason,
      reference: input.reference ?? null,
      recordedById: recordedById ?? null,
    });

    return tx.inventoryItem.findUniqueOrThrow({ where: { id } });
  }, TRANSACTION_OPTIONS);

  return toInventoryItem(item);
}

/**
 * What has happened to this part, newest first, and what it has cost over
 * time. This is the answer to "we cannot track the prices": every receipt is
 * here with the price paid and who it came from.
 */
export async function getStockHistory(
  user: AuthenticatedUser,
  id: string,
): Promise<StockHistoryResponse> {
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) {
    throw HttpError.notFound("We could not find that part.");
  }

  // A technician may only look at their own section, the same rule the list
  // itself follows.
  if (user.role === "STAFF" && item.section !== user.section) {
    throw HttpError.notFound("We could not find that part.");
  }

  const movements = await prisma.stockMovement.findMany({
    where: { inventoryItemId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      recordedBy: { select: { id: true, fullName: true } },
      job: { select: { id: true, serviceRequestId: true } },
    },
  });

  const receipts = movements.filter((movement) => movement.type === "RECEIPT");

  const purchased = receipts.reduce(
    (total, movement) => total.add(movement.unitCost.mul(movement.quantity)),
    new Decimal(0),
  );
  const purchasedUnits = receipts.reduce((total, movement) => total + movement.quantity, 0);

  return {
    item: toInventoryItem(item),
    movements: movements.map(toStockMovement),
    summary: {
      onHand: item.quantityInStock,
      valuation: item.unitCost.mul(Math.max(item.quantityInStock, 0)).toFixed(2),
      averageUnitCost: item.unitCost.toFixed(2),
      lastPaid: receipts[0] ? receipts[0].unitCost.toFixed(2) : null,
      lastReceivedAt: receipts[0] ? receipts[0].createdAt.toISOString() : null,
      totalPurchased: purchased.toFixed(2),
      totalUnitsPurchased: purchasedUnits,
    },
  };
}

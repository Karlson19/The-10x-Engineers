import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/http-error";

const { Decimal } = Prisma;

/**
 * The stock ledger.
 *
 * Everything that moves stock goes through here, and every movement is written
 * as its own immutable row carrying the price it moved at. Before this existed
 * an item held a single quantity and a single cost, both overwritten in place:
 * a restock recorded no price at all, changing the cost destroyed whatever it
 * was before, and a count that had drifted could never be traced to the thing
 * that moved it.
 *
 * Two rules hold the design together.
 *
 * One: the shelf count on the item and the ledger are written in the same
 * transaction, never apart. The count is a cache of the ledger, so if they ever
 * disagree the ledger is right.
 *
 * Two: nothing is ever updated or deleted. A part put back on the shelf is a
 * new movement in the opposite direction, not the removal of the old one, so
 * what happened stays readable afterwards.
 */

/** Any Prisma client, so callers can pass their own transaction. */
type Db = Prisma.TransactionClient;

export type MovementInput = {
  inventoryItemId: string;
  /** Signed. Positive puts stock on, negative takes it off. */
  quantity: number;
  type: "RECEIPT" | "CONSUMPTION" | "RETURN" | "ADJUSTMENT";
  unitCost?: Prisma.Decimal;
  reference?: string | null;
  note?: string | null;
  supplier?: string | null;
  jobId?: string | null;
  workLogEntryId?: string | null;
  recordedById?: string | null;
};

/**
 * Weighted average of what is actually on the shelf.
 *
 * Buying ten at 180 and later ten at 220 does not make the ten already there
 * worth 220. Averaging over what is held means a job is costed close to what
 * its parts really cost, and the value of the shelf is a figure that can be
 * defended. The alternative, letting the newest price stand for everything,
 * silently rewrites the cost of stock bought months ago.
 */
export function weightedAverage(
  currentQuantity: number,
  currentUnitCost: Prisma.Decimal,
  incomingQuantity: number,
  incomingUnitCost: Prisma.Decimal,
): Prisma.Decimal {
  const held = Math.max(currentQuantity, 0);
  const total = held + incomingQuantity;

  if (total <= 0) {
    return incomingUnitCost;
  }

  // An empty shelf has no cost worth averaging against, so the new price simply
  // becomes the cost.
  if (held === 0) {
    return incomingUnitCost;
  }

  const heldValue = currentUnitCost.mul(held);
  const incomingValue = incomingUnitCost.mul(incomingQuantity);

  return heldValue.add(incomingValue).div(total).toDecimalPlaces(2);
}

/**
 * Posts one movement and moves the shelf count with it.
 *
 * The decrement is a conditional update rather than a read followed by a write,
 * so two technicians claiming the last part at the same moment cannot both
 * succeed and drive the count negative.
 */
export async function postMovement(db: Db, input: MovementInput) {
  if (input.quantity === 0) {
    throw HttpError.badRequest("A stock movement has to move something.", {
      quantity: "Enter an amount other than zero.",
    });
  }

  const item = await db.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
  if (!item) {
    throw HttpError.notFound("We could not find that part.");
  }

  const isOutward = input.quantity < 0;
  const magnitude = Math.abs(input.quantity);

  let unitCost = input.unitCost ?? item.unitCost;
  let nextUnitCost = item.unitCost;

  if (isOutward) {
    // Stock leaving is valued at what the shelf is currently worth, and that
    // figure is frozen onto the movement so a later purchase cannot rewrite
    // the cost of a job that is already done.
    unitCost = item.unitCost;

    const claimed = await db.inventoryItem.updateMany({
      where: { id: input.inventoryItemId, quantityInStock: { gte: magnitude } },
      data: { quantityInStock: { decrement: magnitude } },
    });

    if (claimed.count === 0) {
      throw HttpError.insufficientStock(
        `There are only ${item.quantityInStock} of ${item.name} left in stock.`,
        { quantity: `Enter ${item.quantityInStock} or fewer.`, available: item.quantityInStock },
      );
    }
  } else {
    // Only a purchase changes what stock is worth. A part coming back from a
    // job is returned at the cost it left at, so putting it back must not move
    // the average.
    if (input.type === "RECEIPT") {
      nextUnitCost = weightedAverage(item.quantityInStock, item.unitCost, magnitude, unitCost);
    } else {
      unitCost = item.unitCost;
    }

    await db.inventoryItem.update({
      where: { id: input.inventoryItemId },
      data: { quantityInStock: { increment: magnitude }, unitCost: nextUnitCost },
    });
  }

  const balanceAfter = item.quantityInStock + input.quantity;

  return db.stockMovement.create({
    data: {
      inventoryItemId: input.inventoryItemId,
      type: input.type,
      quantity: input.quantity,
      unitCost,
      balanceAfter,
      reference: input.reference ?? null,
      note: input.note ?? null,
      supplier: input.supplier ?? null,
      jobId: input.jobId ?? null,
      workLogEntryId: input.workLogEntryId ?? null,
      recordedById: input.recordedById ?? null,
    },
  });
}

/**
 * What the shelf is worth right now, and what it has cost over a period.
 * Both come off the ledger rather than off the item, because the item only
 * knows about today.
 */
export async function valuation(db: Db, inventoryItemId?: string) {
  const where = inventoryItemId ? { id: inventoryItemId } : {};
  const items = await db.inventoryItem.findMany({ where });

  return items.reduce(
    (total, item) => total.add(item.unitCost.mul(Math.max(item.quantityInStock, 0))),
    new Decimal(0),
  );
}

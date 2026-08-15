import { z } from "zod";
import { sectionSchema } from "../enums";
import { moneySchema, paginationQuerySchema } from "./common";

export const inventoryItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  sku: z.string(),
  section: sectionSchema,
  quantityInStock: z.number().int(),
  unitCost: moneySchema,
  reorderLevel: z.number().int(),
  /** A photograph of the part, if the workshop has one. */
  imageUrl: z.string().nullable(),
  /** Derived, so the client never has to work out the rule for itself. */
  isLowStock: z.boolean(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

/**
 * Either a path to an image shipped with the app, or a link to the workshop's
 * own photograph. Anything else is refused rather than rendered, so a bad value
 * cannot point the page at something unexpected.
 */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value.startsWith("/") || value.startsWith("https://"),
    "Use a link starting with https, or a path starting with a slash.",
  );

export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, "Enter a stock code.")
  .max(40)
  .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and hyphens only.");

/** Prices arrive as strings so no precision is lost on the way in either. */
export const priceInputSchema = z
  .string()
  .trim()
  .regex(/^\d{1,8}(\.\d{1,2})?$/, "Enter an amount, for example 45.00.");

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(2, "Enter the part name.").max(120),
  sku: skuSchema,
  section: sectionSchema,
  quantityInStock: z.number().int().min(0, "Stock cannot be negative.").max(1_000_000),
  unitCost: priceInputSchema,
  reorderLevel: z.number().int().min(0).max(10_000),
  imageUrl: imageUrlSchema.nullable().optional(),
  /** Recorded against the opening stock, so even that has a price history. */
  supplier: z.string().trim().max(120).optional(),
  reference: z.string().trim().max(60).optional(),
});
export type CreateInventoryItem = z.infer<typeof createInventoryItemSchema>;

/**
 * What may be edited by hand. The count and the cost are absent on purpose:
 * they are the result of what has been received and used, so typing over them
 * would put the item and its ledger out of step with no record of why. Stock
 * comes in through a receipt and corrections go through an adjustment.
 */
export const updateInventoryItemSchema = createInventoryItemSchema
  .omit({ quantityInStock: true, unitCost: true, supplier: true, reference: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to change.",
  });
export type UpdateInventoryItem = z.infer<typeof updateInventoryItemSchema>;

/** Stock arriving from a supplier, with what was actually paid for it. */
export const receiveStockSchema = z.object({
  quantity: z.number().int().min(1, "Enter how many arrived.").max(1_000_000),
  unitCost: priceInputSchema,
  supplier: z.string().trim().max(120).optional(),
  /** The supplier's invoice or delivery note number. */
  reference: z.string().trim().max(60).optional(),
  note: z.string().trim().max(300).optional(),
});
export type ReceiveStock = z.infer<typeof receiveStockSchema>;

/**
 * A stock take correction. The counted figure is sent rather than a difference,
 * because that is what somebody standing at the shelf actually has, and a
 * reason is required because a count is only ever wrong for a reason.
 */
export const adjustStockSchema = z.object({
  countedQuantity: z.number().int().min(0, "A count cannot be negative.").max(1_000_000),
  reason: z.string().trim().min(3, "Say what happened.").max(300),
  reference: z.string().trim().max(60).optional(),
});
export type AdjustStock = z.infer<typeof adjustStockSchema>;

export const stockMovementTypeSchema = z.enum([
  "RECEIPT",
  "CONSUMPTION",
  "RETURN",
  "ADJUSTMENT",
]);
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;

export const STOCK_MOVEMENT_LABELS: Readonly<Record<StockMovementType, string>> = {
  RECEIPT: "Received",
  CONSUMPTION: "Used on a job",
  RETURN: "Put back",
  ADJUSTMENT: "Adjusted",
};

export const stockMovementSchema = z.object({
  id: z.uuid(),
  type: stockMovementTypeSchema,
  /** Signed: positive put stock on the shelf, negative took it off. */
  quantity: z.number().int(),
  unitCost: moneySchema,
  /** quantity times unitCost, so the client never recomputes money. */
  lineValue: moneySchema,
  balanceAfter: z.number().int(),
  reference: z.string().nullable(),
  note: z.string().nullable(),
  supplier: z.string().nullable(),
  jobId: z.uuid().nullable(),
  recordedBy: z.object({ id: z.uuid(), fullName: z.string() }).nullable(),
  createdAt: z.iso.datetime(),
});
export type StockMovement = z.infer<typeof stockMovementSchema>;

export const stockHistoryResponseSchema = z.object({
  item: inventoryItemSchema,
  movements: z.array(stockMovementSchema),
  summary: z.object({
    onHand: z.number().int(),
    /** What the stock on the shelf is worth at the current average cost. */
    valuation: moneySchema,
    averageUnitCost: moneySchema,
    /** What was paid the last time any arrived, which is the price signal. */
    lastPaid: moneySchema.nullable(),
    lastReceivedAt: z.iso.datetime().nullable(),
    totalPurchased: moneySchema,
    totalUnitsPurchased: z.number().int(),
  }),
});
export type StockHistoryResponse = z.infer<typeof stockHistoryResponseSchema>;

export const inventoryListQuerySchema = paginationQuerySchema.extend({
  section: sectionSchema.optional(),
  lowStock: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().trim().min(1).max(60).optional(),
});
export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;

export const inventoryListResponseSchema = z.object({
  data: z.array(inventoryItemSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type InventoryListResponse = z.infer<typeof inventoryListResponseSchema>;

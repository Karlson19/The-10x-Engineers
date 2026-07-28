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
  /** Derived, so the client never has to work out the rule for itself. */
  isLowStock: z.boolean(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

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
});
export type CreateInventoryItem = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = createInventoryItemSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to change.",
  });
export type UpdateInventoryItem = z.infer<typeof updateInventoryItemSchema>;

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

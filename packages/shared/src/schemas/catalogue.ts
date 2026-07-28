import { z } from "zod";
import { sectionSchema } from "../enums";
import { moneySchema } from "./common";

export const serviceCatalogItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  section: sectionSchema,
  basePrice: moneySchema,
  isActive: z.boolean(),
});
export type ServiceCatalogItem = z.infer<typeof serviceCatalogItemSchema>;

export const serviceCatalogueQuerySchema = z.object({
  section: sectionSchema.optional(),
  /** Management can ask for retired items too. Everyone else sees active only. */
  includeInactive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type ServiceCatalogueQuery = z.infer<typeof serviceCatalogueQuerySchema>;

export const serviceCatalogueResponseSchema = z.object({
  data: z.array(serviceCatalogItemSchema),
});
export type ServiceCatalogueResponse = z.infer<typeof serviceCatalogueResponseSchema>;

/** Prices arrive as strings so no precision is lost on the way in either. */
export const catalogueePriceSchema = z
  .string()
  .trim()
  .regex(/^\d{1,8}(\.\d{1,2})?$/, "Enter an amount, for example 450.00.");

export const createServiceCatalogItemSchema = z.object({
  name: z.string().trim().min(2, "Enter the service name.").max(120),
  description: z.string().trim().min(5, "Say what the service covers.").max(500),
  section: sectionSchema,
  basePrice: catalogueePriceSchema,
  isActive: z.boolean().default(true),
});
export type CreateServiceCatalogItem = z.infer<typeof createServiceCatalogItemSchema>;

export const updateServiceCatalogItemSchema = createServiceCatalogItemSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to change.",
  });
export type UpdateServiceCatalogItem = z.infer<typeof updateServiceCatalogItemSchema>;

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

import { z } from "zod";
import { paginationQuerySchema } from "./common";

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Ghanaian plates read like "GR 4821-19" or "AS 1234-22". Kept deliberately
 * loose so an older or imported plate is never rejected at the door.
 */
export const registrationNoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(4, "Enter the registration number.")
  .max(15, "That registration number is too long.")
  .regex(/^[A-Z0-9][A-Z0-9 -]*$/, "Use letters, numbers, spaces and hyphens only.");

export const createVehicleRequestSchema = z.object({
  make: z.string().trim().min(1, "Enter the make, for example Toyota.").max(40),
  model: z.string().trim().min(1, "Enter the model, for example Corolla.").max(40),
  year: z
    .number()
    .int()
    .min(1950, "Enter a year from 1950 onwards.")
    .max(CURRENT_YEAR + 1, "That year is in the future."),
  registrationNo: registrationNoSchema,
  notes: z.string().trim().max(500, "Keep notes under 500 characters.").optional(),
});
export type CreateVehicleRequest = z.infer<typeof createVehicleRequestSchema>;

export const updateVehicleRequestSchema = createVehicleRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to change.",
  });
export type UpdateVehicleRequest = z.infer<typeof updateVehicleRequestSchema>;

export const vehicleSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  registrationNo: z.string(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  /** How many service requests this vehicle has, for the service history link. */
  serviceRequestCount: z.number().int().nonnegative(),
});
export type Vehicle = z.infer<typeof vehicleSchema>;

/** The trimmed shape carried inside a service request. */
export const vehicleSummarySchema = z.object({
  id: z.uuid(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  registrationNo: z.string(),
});
export type VehicleSummary = z.infer<typeof vehicleSummarySchema>;

export const vehicleListQuerySchema = paginationQuerySchema.extend({
  ownerId: z.uuid().optional(),
  search: z.string().trim().min(1).max(60).optional(),
});
export type VehicleListQuery = z.infer<typeof vehicleListQuerySchema>;

export const vehicleResponseSchema = z.object({ vehicle: vehicleSchema });
export const vehicleListResponseSchema = z.object({
  data: z.array(vehicleSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type VehicleListResponse = z.infer<typeof vehicleListResponseSchema>;

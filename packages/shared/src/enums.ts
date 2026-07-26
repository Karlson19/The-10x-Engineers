import { z } from "zod";

/**
 * These mirror the enums in apps/api/prisma/schema.prisma. They are the single
 * definition used by API validation, client forms and the generated OpenAPI doc.
 */

export const roleSchema = z.enum(["CLIENT", "STAFF", "MANAGEMENT"]);
export type Role = z.infer<typeof roleSchema>;

export const sectionSchema = z.enum(["MECHANICAL", "ELECTRICAL"]);
export type Section = z.infer<typeof sectionSchema>;

export const requestStatusSchema = z.enum([
  "SUBMITTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "AWAITING_APPROVAL",
  "COMPLETED",
  "CANCELLED",
]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const jobStatusSchema = z.enum(["ASSIGNED", "IN_PROGRESS", "COMPLETED"]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const lineTypeSchema = z.enum(["PART", "LABOUR"]);
export type LineType = z.infer<typeof lineTypeSchema>;

export const paymentMethodSchema = z.enum(["PAYSTACK", "MOMO", "CASH"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const ROLES = roleSchema.options;
export const SECTIONS = sectionSchema.options;
export const REQUEST_STATUSES = requestStatusSchema.options;
export const JOB_STATUSES = jobStatusSchema.options;
export const LINE_TYPES = lineTypeSchema.options;
export const PAYMENT_METHODS = paymentMethodSchema.options;
export const PAYMENT_STATUSES = paymentStatusSchema.options;

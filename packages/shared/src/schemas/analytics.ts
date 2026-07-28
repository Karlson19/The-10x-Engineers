import { z } from "zod";
import { requestStatusSchema, sectionSchema } from "../enums";
import { moneySchema } from "./common";

/** Period is a calendar month, "2026-07". Defaults to the current month. */
export const analyticsQuerySchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month in the form 2026-07.")
    .optional(),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export const statusBreakdownEntrySchema = z.object({
  status: requestStatusSchema,
  count: z.number().int().nonnegative(),
});

export const monthlyPointSchema = z.object({
  /** "2026-07", so the client formats it rather than parsing a label. */
  month: z.string(),
  revenue: moneySchema,
  expenses: moneySchema,
});
export type MonthlyPoint = z.infer<typeof monthlyPointSchema>;

export const topServiceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  section: sectionSchema,
  bookings: z.number().int().nonnegative(),
  basePrice: moneySchema,
});
export type TopService = z.infer<typeof topServiceSchema>;

export const lowStockLineSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  sku: z.string(),
  section: sectionSchema,
  quantityInStock: z.number().int(),
  reorderLevel: z.number().int(),
});

/**
 * Everything the management dashboard needs, in one request. Revenue is money
 * actually taken. Expenses are the parts consumed, valued at cost, because
 * labour is staff time rather than a cash outlay.
 */
export const analyticsSummarySchema = z.object({
  period: z.string(),
  bookings: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
  activeJobs: z.number().int().nonnegative(),
  revenue: moneySchema,
  expenses: moneySchema,
  net: moneySchema,
  /** Completed divided by booked, as a fraction between 0 and 1. */
  conversionRate: z.number().min(0).max(1),
  averageRating: z.number().min(0).max(5).nullable(),
  statusBreakdown: z.array(statusBreakdownEntrySchema),
  revenueByMonth: z.array(monthlyPointSchema),
  topServices: z.array(topServiceSchema),
  lowStockCount: z.number().int().nonnegative(),
  lowStockItems: z.array(lowStockLineSchema),
});
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;

export const analyticsSummaryResponseSchema = z.object({ summary: analyticsSummarySchema });

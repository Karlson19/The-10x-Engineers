import { z } from "zod";
import { jobStatusSchema, lineTypeSchema, sectionSchema } from "../enums";
import { moneySchema, paginationQuerySchema } from "./common";
import { priceInputSchema } from "./inventory";
import { clientSummarySchema } from "./service-request";
import { vehicleSummarySchema } from "./vehicle";

export const assignedStaffSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  section: sectionSchema.nullable(),
});

export const workLogEntrySchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  inventoryItemId: z.uuid().nullable(),
  lineType: lineTypeSchema,
  description: z.string(),
  quantity: z.number().int(),
  unitCost: moneySchema,
  /** quantity multiplied by unitCost, worked out once on the server. */
  lineTotal: moneySchema,
  createdAt: z.iso.datetime(),
});
export type WorkLogEntry = z.infer<typeof workLogEntrySchema>;

export const jobSchema = z.object({
  id: z.uuid(),
  serviceRequestId: z.uuid(),
  /** The reference of the request, so a job can be quoted over the phone too. */
  reference: z.string(),
  status: jobStatusSchema,
  section: sectionSchema,
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  diagnosisNotes: z.string().nullable(),
  workSummary: z.string().nullable(),
  createdAt: z.iso.datetime(),
  assignedStaff: assignedStaffSchema,
  client: clientSummarySchema,
  vehicle: vehicleSummarySchema,
  preferredDateTime: z.iso.datetime(),
  requestStatus: z.string(),
  symptomCategory: z.string(),
  estimatedCost: moneySchema.nullable(),
  /** Running total of every work log line on this job. */
  workLogTotal: moneySchema,
});
export type Job = z.infer<typeof jobSchema>;

export const createJobSchema = z.object({
  serviceRequestId: z.uuid(),
  assignedStaffId: z.uuid(),
  /**
   * Assigning normally schedules the booking at the same time, because that is
   * what actually happens at the counter.
   */
  scheduleRequest: z.boolean().default(true),
  note: z.string().trim().max(500).optional(),
});
export type CreateJob = z.infer<typeof createJobSchema>;

export const updateJobSchema = z
  .object({
    status: jobStatusSchema.optional(),
    diagnosisNotes: z.string().trim().max(2000).nullable().optional(),
    workSummary: z.string().trim().max(2000).nullable().optional(),
    assignedStaffId: z.uuid().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to change.",
  });
export type UpdateJob = z.infer<typeof updateJobSchema>;

/**
 * A part line draws from stock and must name an inventory item. A labour line
 * is free text and hours, and touches no stock at all.
 */
export const createWorkLogEntrySchema = z
  .object({
    lineType: lineTypeSchema,
    inventoryItemId: z.uuid().nullable().optional(),
    description: z.string().trim().max(200).optional(),
    quantity: z
      .number()
      .int()
      .min(1, "Enter at least one.")
      .max(1000, "That is more than we would ever fit."),
    unitCost: priceInputSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.lineType === "PART") {
      if (!value.inventoryItemId) {
        ctx.addIssue({
          code: "custom",
          path: ["inventoryItemId"],
          message: "Choose the part used.",
        });
      }
      return;
    }

    if (!value.description || value.description.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["description"],
        message: "Say what the labour was for.",
      });
    }
    if (!value.unitCost) {
      ctx.addIssue({
        code: "custom",
        path: ["unitCost"],
        message: "Enter the hourly rate.",
      });
    }
  });
export type CreateWorkLogEntry = z.infer<typeof createWorkLogEntrySchema>;

export const jobListQuerySchema = paginationQuerySchema.extend({
  /**
   * A single status, or "OPEN" for everything still on the floor. The queue
   * opens on OPEN, because a technician wants the work in front of them, not a
   * list led by jobs they finished months ago.
   */
  status: z.union([jobStatusSchema, z.literal("OPEN")]).optional(),
  section: sectionSchema.optional(),
  assignedStaffId: z.uuid().optional(),
  /** Today's queue, which is what a technician opens the app for. */
  scheduledFor: z.enum(["today", "upcoming", "all"]).optional(),
});
export type JobListQuery = z.infer<typeof jobListQuerySchema>;

/**
 * What was done and what it came to, for the customer whose vehicle it was.
 *
 * Separate from the work log a technician edits: this is scoped by ownership of
 * the booking rather than assignment of the job, so the person paying can read
 * it without being given access to the workshop's own screens.
 */
export const requestInvoiceSchema = z.object({
  reference: z.string(),
  lines: z.array(workLogEntrySchema),
  partsTotal: moneySchema,
  labourTotal: moneySchema,
  total: moneySchema,
  estimatedCost: moneySchema.nullable(),
  /** True once the booking is completed. Before that it is work so far. */
  isFinal: z.boolean(),
});
export type RequestInvoice = z.infer<typeof requestInvoiceSchema>;

export const requestInvoiceResponseSchema = z.object({ invoice: requestInvoiceSchema });

export const jobResponseSchema = z.object({ job: jobSchema });
export const jobListResponseSchema = z.object({
  data: z.array(jobSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type JobListResponse = z.infer<typeof jobListResponseSchema>;

export const workLogResponseSchema = z.object({
  data: z.array(workLogEntrySchema),
  total: moneySchema,
});
export type WorkLogResponse = z.infer<typeof workLogResponseSchema>;

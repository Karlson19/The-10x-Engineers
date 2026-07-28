import { z } from "zod";
import { paginationQuerySchema } from "./common";

export const notificationSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const notificationListResponseSchema = z.object({
  data: z.array(notificationSchema),
  /** Drives the badge on the bell, so the client does not have to count. */
  unreadCount: z.number().int().nonnegative(),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;

export const notificationResponseSchema = z.object({ notification: notificationSchema });

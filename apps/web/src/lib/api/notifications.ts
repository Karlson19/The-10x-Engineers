import { z } from "zod";
import {
  type Notification,
  type NotificationListResponse,
  notificationListResponseSchema,
  notificationResponseSchema,
} from "@chrysmec/shared";
import { apiRequest } from "./client";

/** How many rows the server actually marked. */
const markAllResponseSchema = z.object({ updated: z.number().int().nonnegative() });

/** The bell only ever needs the most recent handful plus the unread count. */
export function fetchNotifications(limit = 20): Promise<NotificationListResponse> {
  return apiRequest(`/notifications?limit=${limit}`, notificationListResponseSchema);
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const result = await apiRequest(`/notifications/${id}/read`, notificationResponseSchema, {
    method: "PATCH",
  });
  return result.notification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const result = await apiRequest("/notifications/read-all", markAllResponseSchema, {
    method: "PATCH",
  });
  return result.updated;
}

import type { Prisma } from "@prisma/client";
import type {
  Notification,
  NotificationListQuery,
  PaginationMeta,
} from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";

function toNotification(row: {
  id: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}): Notification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Notifications belong to one person. There is no route to anyone else's. */
export async function listNotifications(
  user: AuthenticatedUser,
  query: NotificationListQuery,
): Promise<{ data: Notification[]; unreadCount: number; meta: PaginationMeta }> {
  const where: Prisma.NotificationWhereInput = { userId: user.id };

  if (query.unreadOnly) {
    where.readAt = null;
  }

  const [total, rows, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return {
    data: rows.map(toNotification),
    unreadCount,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function markNotificationRead(
  user: AuthenticatedUser,
  id: string,
): Promise<Notification> {
  // Scoped by userId in the same query, so one person cannot read another's.
  const existing = await prisma.notification.findFirst({ where: { id, userId: user.id } });

  if (!existing) {
    throw HttpError.notFound("We could not find that notification.");
  }

  if (existing.readAt) {
    return toNotification(existing);
  }

  return toNotification(
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } }),
  );
}

export async function markAllNotificationsRead(user: AuthenticatedUser): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return result.count;
}

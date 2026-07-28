import type { RequestHandler } from "express";
import { idParamSchema, notificationListQuerySchema } from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service";

export const list: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const query = notificationListQuerySchema.parse(req.query);

  res.status(200).json(await listNotifications(user, query));
};

export const markRead: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  res.status(200).json({ notification: await markNotificationRead(user, id) });
};

export const markAllRead: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);

  res.status(200).json({ updated: await markAllNotificationsRead(user) });
};

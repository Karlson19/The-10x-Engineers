import { Router } from "express";
import { list, markAllRead, markRead } from "../controllers/notification.controller";
import { authenticate } from "../middleware/authenticate";

export const notificationRouter: Router = Router();

// Everyone has notifications, and everyone only ever sees their own.
notificationRouter.use(authenticate);

notificationRouter.get("/", list);
notificationRouter.patch("/read-all", markAllRead);
notificationRouter.patch("/:id/read", markRead);

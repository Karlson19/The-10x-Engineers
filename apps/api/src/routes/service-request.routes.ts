import { Router } from "express";
import {
  create,
  getOne,
  invoice,
  leaveFeedback,
  list,
  patch,
  patchStatus,
  readFeedback,
  remove,
  timeline,
} from "../controllers/service-request.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const serviceRequestRouter: Router = Router();

serviceRequestRouter.use(authenticate);

// Only a customer books. Everything else is scoped inside the service: a client
// sees their own, a technician sees their section, management sees all.
serviceRequestRouter.post("/", requireRole("CLIENT"), create);
serviceRequestRouter.get("/", list);
serviceRequestRouter.get("/:id", getOne);
serviceRequestRouter.patch("/:id", patch);
// Open to every role because a customer answers their own estimate here. Which
// moves each role may actually make is decided in the service.
serviceRequestRouter.patch("/:id/status", patchStatus);
serviceRequestRouter.delete("/:id", remove);
serviceRequestRouter.get("/:id/timeline", timeline);
// What was done and what it cost. Scoped by ownership of the booking, so a
// customer can read their own bill without access to the workshop's screens.
serviceRequestRouter.get("/:id/invoice", invoice);

// Feedback closes the loop after a job. Only the customer leaves it, and the
// service checks the work is actually finished.
serviceRequestRouter.post("/:id/feedback", requireRole("CLIENT"), leaveFeedback);
serviceRequestRouter.get("/:id/feedback", readFeedback);

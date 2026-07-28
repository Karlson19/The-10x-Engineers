import { Router } from "express";
import {
  addLogEntry,
  create,
  getOne,
  list,
  listLog,
  patch,
  removeLogEntry,
} from "../controllers/job.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const jobRouter: Router = Router();

// Customers follow their vehicle through the status timeline, not through here.
jobRouter.use(authenticate, requireRole("STAFF", "MANAGEMENT"));

jobRouter.get("/", list);
jobRouter.post("/", requireRole("MANAGEMENT"), create);
jobRouter.get("/:id", getOne);
jobRouter.patch("/:id", patch);

jobRouter.get("/:id/worklog", listLog);
jobRouter.post("/:id/worklog", addLogEntry);
jobRouter.delete("/:id/worklog/:entryId", removeLogEntry);

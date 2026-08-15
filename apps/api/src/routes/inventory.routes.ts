import { Router } from "express";
import {
  adjust,
  create,
  history,
  list,
  patch,
  receive,
} from "../controllers/inventory.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const inventoryRouter: Router = Router();

// Technicians read the stock for their own section. Management edits it.
inventoryRouter.use(authenticate, requireRole("STAFF", "MANAGEMENT"));

inventoryRouter.get("/", list);
// A technician can see where a part went and what it cost, scoped to their own
// section inside the service. Knowing that is part of doing the job.
inventoryRouter.get("/:id/history", history);

inventoryRouter.post("/", requireRole("MANAGEMENT"), create);
inventoryRouter.patch("/:id", requireRole("MANAGEMENT"), patch);
// Money leaves the business here, so both of these are management only.
inventoryRouter.post("/:id/receive", requireRole("MANAGEMENT"), receive);
inventoryRouter.post("/:id/adjust", requireRole("MANAGEMENT"), adjust);

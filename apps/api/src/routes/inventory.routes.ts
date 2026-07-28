import { Router } from "express";
import { create, list, patch, restock } from "../controllers/inventory.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const inventoryRouter: Router = Router();

// Technicians read the stock for their own section. Management edits it.
inventoryRouter.use(authenticate, requireRole("STAFF", "MANAGEMENT"));

inventoryRouter.get("/", list);
inventoryRouter.post("/", requireRole("MANAGEMENT"), create);
inventoryRouter.patch("/:id", requireRole("MANAGEMENT"), patch);
inventoryRouter.post("/:id/restock", requireRole("MANAGEMENT"), restock);

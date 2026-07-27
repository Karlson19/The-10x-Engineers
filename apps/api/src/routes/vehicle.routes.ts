import { Router } from "express";
import { create, getOne, list, patch, remove } from "../controllers/vehicle.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const vehicleRouter: Router = Router();

// Clients manage their own vehicles, management manages everyone's. Technicians
// see vehicle details through the job they are working on instead.
vehicleRouter.use(authenticate, requireRole("CLIENT", "MANAGEMENT"));

vehicleRouter.get("/", list);
vehicleRouter.post("/", create);
vehicleRouter.get("/:id", getOne);
vehicleRouter.patch("/:id", patch);
vehicleRouter.delete("/:id", remove);

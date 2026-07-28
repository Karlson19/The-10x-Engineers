import { Router } from "express";
import { summary } from "../controllers/analytics.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const analyticsRouter: Router = Router();

analyticsRouter.use(authenticate, requireRole("MANAGEMENT"));

analyticsRouter.get("/summary", summary);

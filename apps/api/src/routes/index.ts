import { Router } from "express";
import { healthRouter } from "./health.routes";

/**
 * Everything under /api/v1. One router file per resource, mounted here.
 * Auth, vehicles, service requests, jobs, inventory and analytics arrive in
 * later phases.
 */
export const apiRouter: Router = Router();

apiRouter.use(healthRouter);

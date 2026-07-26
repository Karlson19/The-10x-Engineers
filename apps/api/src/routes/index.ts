import { Router } from "express";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { userRouter } from "./user.routes";

/**
 * Everything under /api/v1. One router file per resource, mounted here.
 * Vehicles, service requests, jobs, inventory and analytics arrive in later
 * phases.
 */
export const apiRouter: Router = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);

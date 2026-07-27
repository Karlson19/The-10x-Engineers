import { Router } from "express";
import { authRouter } from "./auth.routes";
import { catalogueRouter } from "./catalogue.routes";
import { healthRouter } from "./health.routes";
import { serviceRequestRouter } from "./service-request.routes";
import { userRouter } from "./user.routes";
import { vehicleRouter } from "./vehicle.routes";

/**
 * Everything under /api/v1. One router file per resource, mounted here.
 * Jobs, inventory and analytics arrive in later phases.
 */
export const apiRouter: Router = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/vehicles", vehicleRouter);
apiRouter.use("/service-requests", serviceRequestRouter);
apiRouter.use("/services", catalogueRouter);

import { Router } from "express";
import { healthController } from "../controllers/health.controller";

export const healthRouter: Router = Router();

healthRouter.get("/health", healthController);

import type { RequestHandler } from "express";
import { getHealth } from "../services/health.service";

/** Controllers parse and delegate. The logic lives in the service. */
export const healthController: RequestHandler = async (_req, res) => {
  const health = await getHealth();
  res.status(200).json(health);
};

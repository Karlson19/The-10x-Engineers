import type { RequestHandler } from "express";
import { analyticsQuerySchema } from "@chrysmec/shared";
import { getAnalyticsSummary } from "../services/analytics.service";

export const summary: RequestHandler = async (req, res) => {
  const { period } = analyticsQuerySchema.parse(req.query);

  res.status(200).json({ summary: await getAnalyticsSummary(period) });
};

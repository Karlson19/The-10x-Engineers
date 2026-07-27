import type { RequestHandler } from "express";
import { serviceCatalogueQuerySchema } from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import { listCatalogue } from "../services/catalogue.service";

export const list: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const query = serviceCatalogueQuerySchema.parse(req.query);

  res.status(200).json({ data: await listCatalogue(user, query) });
};

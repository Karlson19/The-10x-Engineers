import type { RequestHandler } from "express";
import {
  createServiceCatalogItemSchema,
  idParamSchema,
  serviceCatalogueQuerySchema,
  updateServiceCatalogItemSchema,
} from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import {
  createCatalogueItem,
  listCatalogue,
  retireCatalogueItem,
  updateCatalogueItem,
} from "../services/catalogue.service";

export const list: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const query = serviceCatalogueQuerySchema.parse(req.query);

  res.status(200).json({ data: await listCatalogue(user, query) });
};

export const create: RequestHandler = async (req, res) => {
  const input = createServiceCatalogItemSchema.parse(req.body);

  res.status(201).json({ item: await createCatalogueItem(input) });
};

export const patch: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateServiceCatalogItemSchema.parse(req.body);

  res.status(200).json({ item: await updateCatalogueItem(id, input) });
};

/** Retires the service rather than deleting it, so past bookings still read. */
export const remove: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  res.status(200).json({ item: await retireCatalogueItem(id) });
};

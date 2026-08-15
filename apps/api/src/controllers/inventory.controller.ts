import type { RequestHandler } from "express";
import {
  adjustStockSchema,
  createInventoryItemSchema,
  idParamSchema,
  inventoryListQuerySchema,
  receiveStockSchema,
  updateInventoryItemSchema,
} from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import {
  adjustStock,
  createInventoryItem,
  getStockHistory,
  listInventory,
  receiveStock,
  updateInventoryItem,
} from "../services/inventory.service";

export const list: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const query = inventoryListQuerySchema.parse(req.query);

  res.status(200).json(await listInventory(user, query));
};

export const create: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const input = createInventoryItemSchema.parse(req.body);

  res.status(201).json({ item: await createInventoryItem(input, user.id) });
};

export const patch: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateInventoryItemSchema.parse(req.body);

  res.status(200).json({ item: await updateInventoryItem(id, input) });
};

/** Stock arriving, with the price paid. This is what builds price history. */
export const receive: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = receiveStockSchema.parse(req.body);

  res.status(200).json({ item: await receiveStock(id, input, user.id) });
};

/** A stock take correction, which has to say what happened. */
export const adjust: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = adjustStockSchema.parse(req.body);

  res.status(200).json({ item: await adjustStock(id, input, user.id) });
};

/** Everything that has happened to this part, and what it has cost. */
export const history: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  res.status(200).json(await getStockHistory(user, id));
};

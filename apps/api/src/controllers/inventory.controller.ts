import type { RequestHandler } from "express";
import { z } from "zod";
import {
  createInventoryItemSchema,
  idParamSchema,
  inventoryListQuerySchema,
  updateInventoryItemSchema,
} from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import {
  createInventoryItem,
  listInventory,
  restockInventoryItem,
  updateInventoryItem,
} from "../services/inventory.service";

const restockSchema = z.object({
  quantity: z.number().int().min(1, "Enter how many arrived.").max(100_000),
});

export const list: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const query = inventoryListQuerySchema.parse(req.query);

  res.status(200).json(await listInventory(user, query));
};

export const create: RequestHandler = async (req, res) => {
  const input = createInventoryItemSchema.parse(req.body);

  res.status(201).json({ item: await createInventoryItem(input) });
};

export const patch: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateInventoryItemSchema.parse(req.body);

  res.status(200).json({ item: await updateInventoryItem(id, input) });
};

export const restock: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { quantity } = restockSchema.parse(req.body);

  res.status(200).json({ item: await restockInventoryItem(id, quantity) });
};

import type { RequestHandler } from "express";
import { z } from "zod";
import {
  createVehicleRequestSchema,
  idParamSchema,
  updateVehicleRequestSchema,
  vehicleListQuerySchema,
} from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
} from "../services/vehicle.service";

/** Management may add a vehicle for a customer, so the owner can be named. */
const createBodySchema = createVehicleRequestSchema.extend({
  ownerId: z.uuid().optional(),
});

export const list: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const query = vehicleListQuerySchema.parse(req.query);

  res.status(200).json(await listVehicles(user, query));
};

export const create: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { ownerId, ...input } = createBodySchema.parse(req.body);

  res.status(201).json({ vehicle: await createVehicle(user, input, ownerId) });
};

export const getOne: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  res.status(200).json({ vehicle: await getVehicle(user, id) });
};

export const patch: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateVehicleRequestSchema.parse(req.body);

  res.status(200).json({ vehicle: await updateVehicle(user, id, input) });
};

export const remove: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  await deleteVehicle(user, id);
  res.status(204).send();
};

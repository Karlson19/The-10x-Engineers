import type { RequestHandler } from "express";
import {
  createUserRequestSchema,
  idParamSchema,
  updateUserRequestSchema,
  userListQuerySchema,
} from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import {
  createUser,
  deactivateUser,
  getUserById,
  listUsers,
  updateUser,
} from "../services/user.service";

export const list: RequestHandler = async (req, res) => {
  const query = userListQuerySchema.parse(req.query);
  res.status(200).json(await listUsers(query));
};

export const create: RequestHandler = async (req, res) => {
  const input = createUserRequestSchema.parse(req.body);
  res.status(201).json({ user: await createUser(input) });
};

export const getOne: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json({ user: await getUserById(id) });
};

export const patch: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateUserRequestSchema.parse(req.body);
  res.status(200).json({ user: await updateUser(id, input) });
};

/** Deactivates rather than deletes, so the workshop's record stays intact. */
export const remove: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const actingUser = requireAuthUser(req);

  res.status(200).json({ user: await deactivateUser(id, actingUser.id) });
};

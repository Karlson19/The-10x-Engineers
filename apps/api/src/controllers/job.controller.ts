import type { RequestHandler } from "express";
import { z } from "zod";
import {
  createJobSchema,
  createWorkLogEntrySchema,
  idParamSchema,
  jobListQuerySchema,
  updateJobSchema,
} from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import {
  addWorkLogEntry,
  createJob,
  getJob,
  listJobs,
  listWorkLog,
  removeWorkLogEntry,
  updateJob,
} from "../services/job.service";

const workLogParamsSchema = z.object({ id: z.uuid(), entryId: z.uuid() });

export const list: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const query = jobListQuerySchema.parse(req.query);

  res.status(200).json(await listJobs(user, query));
};

export const create: RequestHandler = async (req, res) => {
  const input = createJobSchema.parse(req.body);

  res.status(201).json({ job: await createJob(input) });
};

export const getOne: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  res.status(200).json({ job: await getJob(user, id) });
};

export const patch: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateJobSchema.parse(req.body);

  res.status(200).json({ job: await updateJob(user, id, input) });
};

export const listLog: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  res.status(200).json(await listWorkLog(user, id));
};

export const addLogEntry: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = createWorkLogEntrySchema.parse(req.body);

  const { entry, total } = await addWorkLogEntry(user, id, input);
  res.status(201).json({ entry, total });
};

export const removeLogEntry: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id, entryId } = workLogParamsSchema.parse(req.params);

  res.status(200).json(await removeWorkLogEntry(user, id, entryId));
};

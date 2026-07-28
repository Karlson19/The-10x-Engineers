import type { RequestHandler } from "express";
import {
  createFeedbackSchema,
  createServiceRequestSchema,
  idParamSchema,
  serviceRequestListQuerySchema,
  updateServiceRequestSchema,
  updateStatusSchema,
} from "@chrysmec/shared";
import { requireAuthUser } from "../middleware/authenticate";
import { createFeedback, getFeedback } from "../services/feedback.service";
import {
  createServiceRequest,
  deleteServiceRequest,
  getServiceRequest,
  getTimeline,
  listServiceRequests,
  updateServiceRequest,
  updateServiceRequestStatus,
} from "../services/service-request.service";

export const create: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const input = createServiceRequestSchema.parse(req.body);

  const { serviceRequest, created } = await createServiceRequest(user, input);

  // A replayed booking from the offline outbox answers 200 with the original
  // record rather than 201, so the client can tell the difference.
  res.status(created ? 201 : 200).json({ serviceRequest });
};

export const list: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const query = serviceRequestListQuerySchema.parse(req.query);

  res.status(200).json(await listServiceRequests(user, query));
};

export const getOne: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  res.status(200).json({ serviceRequest: await getServiceRequest(user, id) });
};

export const patch: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateServiceRequestSchema.parse(req.body);

  res.status(200).json({ serviceRequest: await updateServiceRequest(user, id, input) });
};

export const patchStatus: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateStatusSchema.parse(req.body);

  res.status(200).json({ serviceRequest: await updateServiceRequestStatus(user, id, input) });
};

export const remove: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  await deleteServiceRequest(user, id);
  res.status(204).send();
};

export const leaveFeedback: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = createFeedbackSchema.parse(req.body);

  res.status(201).json({ feedback: await createFeedback(user, id, input) });
};

export const readFeedback: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  res.status(200).json({ feedback: await getFeedback(user, id) });
};

export const timeline: RequestHandler = async (req, res) => {
  const user = requireAuthUser(req);
  const { id } = idParamSchema.parse(req.params);

  res.status(200).json({ data: await getTimeline(user, id) });
};

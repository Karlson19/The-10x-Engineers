import { Router } from "express";
import { confirm, initialize, list, webhook } from "../controllers/payment.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const paymentRouter: Router = Router();

/*
  Paystack's callback, before the session gate. It cannot carry a token, so the
  signature on the raw body is what authenticates it.
*/
paymentRouter.post("/webhook", webhook);

paymentRouter.use(authenticate);

// A customer pays for their own booking. Management can take one over the
// counter on their behalf. Technicians have no business with money.
paymentRouter.post("/initialize", requireRole("CLIENT", "MANAGEMENT"), initialize);
paymentRouter.get("/:reference/confirm", requireRole("CLIENT", "MANAGEMENT"), confirm);
paymentRouter.get("/", requireRole("CLIENT", "MANAGEMENT"), list);

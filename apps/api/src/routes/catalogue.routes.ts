import { Router } from "express";
import { create, list, listPublic, patch, remove } from "../controllers/catalogue.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const catalogueRouter: Router = Router();

// The price list on the public site, before the session gate below. A workshop
// advertises its prices, so this is open on purpose. Active services only.
catalogueRouter.get("/public", listPublic);

// Anyone signed in reads the catalogue, because the booking wizard needs it.
// Only management changes it.
catalogueRouter.use(authenticate);

catalogueRouter.get("/", list);
catalogueRouter.post("/", requireRole("MANAGEMENT"), create);
catalogueRouter.patch("/:id", requireRole("MANAGEMENT"), patch);
catalogueRouter.delete("/:id", requireRole("MANAGEMENT"), remove);

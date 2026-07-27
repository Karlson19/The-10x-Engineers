import { Router } from "express";
import { list } from "../controllers/catalogue.controller";
import { authenticate } from "../middleware/authenticate";

export const catalogueRouter: Router = Router();

// Read only for now. Creating and editing catalogue items arrives with the
// management screens.
catalogueRouter.use(authenticate);
catalogueRouter.get("/", list);

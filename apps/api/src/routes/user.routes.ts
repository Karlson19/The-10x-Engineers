import { Router } from "express";
import { create, getOne, list, patch, remove } from "../controllers/user.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const userRouter: Router = Router();

// Staff accounts and roles are management's business only.
userRouter.use(authenticate, requireRole("MANAGEMENT"));

userRouter.get("/", list);
userRouter.post("/", create);
userRouter.get("/:id", getOne);
userRouter.patch("/:id", patch);
userRouter.delete("/:id", remove);

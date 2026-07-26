import { Router } from "express";
import {
  changePassword,
  me,
  refresh,
  register,
  signIn,
  signOut,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { authRateLimiter } from "../middleware/rate-limit";

export const authRouter: Router = Router();

// Every auth route is rate limited by IP, including the ones that only read.
authRouter.use(authRateLimiter);

authRouter.post("/register", register);
authRouter.post("/login", signIn);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", signOut);

authRouter.get("/me", authenticate, me);
authRouter.post("/change-password", authenticate, changePassword);

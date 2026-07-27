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
import { credentialRateLimiter, sessionRateLimiter } from "../middleware/rate-limit";

export const authRouter: Router = Router();

// Anything that takes a password is held to the strict budget.
authRouter.post("/register", credentialRateLimiter, register);
authRouter.post("/login", credentialRateLimiter, signIn);
authRouter.post("/change-password", credentialRateLimiter, authenticate, changePassword);

// Session upkeep is ordinary traffic, so it gets its own generous ceiling.
authRouter.post("/refresh", sessionRateLimiter, refresh);
authRouter.post("/logout", sessionRateLimiter, signOut);
authRouter.get("/me", sessionRateLimiter, authenticate, me);

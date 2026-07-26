import type { RequestHandler } from "express";
import {
  REFRESH_COOKIE_NAME,
  changePasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
} from "@chrysmec/shared";
import { clearRefreshCookie, setRefreshCookie } from "../lib/cookies";
import { requireAuthUser } from "../middleware/authenticate";
import {
  changeOwnPassword,
  getPublicUser,
  login,
  refreshSession,
  registerClient,
} from "../services/auth.service";

/** Controllers parse the request and delegate. The logic lives in the service. */

export const register: RequestHandler = async (req, res) => {
  const input = registerRequestSchema.parse(req.body);
  const session = await registerClient(input);

  setRefreshCookie(res, session.refreshToken);
  res.status(201).json({ user: session.user, accessToken: session.accessToken });
};

export const signIn: RequestHandler = async (req, res) => {
  const input = loginRequestSchema.parse(req.body);
  const session = await login(input);

  setRefreshCookie(res, session.refreshToken);
  res.status(200).json({ user: session.user, accessToken: session.accessToken });
};

export const refresh: RequestHandler = async (req, res) => {
  const cookies: unknown = req.cookies;
  const token =
    typeof cookies === "object" && cookies !== null && REFRESH_COOKIE_NAME in cookies
      ? (cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME]
      : undefined;

  const session = await refreshSession(token);

  setRefreshCookie(res, session.refreshToken);
  res.status(200).json({ accessToken: session.accessToken });
};

export const signOut: RequestHandler = (_req, res) => {
  clearRefreshCookie(res);
  res.status(204).send();
};

export const me: RequestHandler = async (req, res) => {
  const { id } = requireAuthUser(req);
  res.status(200).json({ user: await getPublicUser(id) });
};

export const changePassword: RequestHandler = async (req, res) => {
  const { id } = requireAuthUser(req);
  const input = changePasswordRequestSchema.parse(req.body);

  await changeOwnPassword(id, input.currentPassword, input.newPassword);

  // The refresh token is still valid, so sign the person out everywhere they
  // are holding this browser's cookie and make them sign in again.
  clearRefreshCookie(res);
  res.status(204).send();
};

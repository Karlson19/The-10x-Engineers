import {
  type AuthResponse,
  type LoginRequest,
  type MeResponse,
  type RegisterRequest,
  authResponseSchema,
  meResponseSchema,
} from "@chrysmec/shared";
import { apiRequest, apiRequestVoid, requestAccessTokenRefresh } from "./client";
import { setAccessToken } from "./token-store";

export async function login(input: LoginRequest): Promise<AuthResponse> {
  const result = await apiRequest("/auth/login", authResponseSchema, {
    method: "POST",
    body: input,
    allowRefresh: false,
  });

  setAccessToken(result.accessToken);
  return result;
}

export async function register(input: RegisterRequest): Promise<AuthResponse> {
  const result = await apiRequest("/auth/register", authResponseSchema, {
    method: "POST",
    body: input,
    allowRefresh: false,
  });

  setAccessToken(result.accessToken);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await apiRequestVoid("/auth/logout", { method: "POST", allowRefresh: false });
  } finally {
    // Even if the call fails, this browser should stop holding a token.
    setAccessToken(null);
  }
}

export function fetchMe(): Promise<MeResponse> {
  return apiRequest("/auth/me", meResponseSchema);
}

/**
 * Runs once when the app starts. The access token is only in memory, so after a
 * reload it is gone. The httpOnly refresh cookie is what restores the session.
 */
export async function restoreSession(): Promise<MeResponse | null> {
  const refreshed = await requestAccessTokenRefresh();

  if (!refreshed) {
    return null;
  }

  return fetchMe();
}

import type { z } from "zod";
import { type ErrorCode, errorEnvelopeSchema, refreshResponseSchema } from "@chrysmec/shared";
import { getAccessToken, getSessionEpoch, setRefreshedAccessToken } from "./token-store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Network failures are not part of the server's error envelope, so they get their own code. */
export type ApiErrorCode = ErrorCode | "NETWORK_ERROR";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: Record<string, string>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when retrying is likely to help, which is what the error state offers. */
  get isRetryable(): boolean {
    return this.code === "NETWORK_ERROR" || this.status >= 500;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    return new ApiError(
      response.status,
      "INTERNAL_ERROR",
      "Something went wrong. Try again in a moment.",
    );
  }

  const parsed = errorEnvelopeSchema.safeParse(body);

  if (!parsed.success) {
    return new ApiError(
      response.status,
      "INTERNAL_ERROR",
      "Something went wrong. Try again in a moment.",
    );
  }

  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data.error.details ?? {})) {
    if (typeof value === "string") {
      details[key] = value;
    }
  }

  return new ApiError(response.status, parsed.data.error.code, parsed.data.error.message, details);
}

/**
 * One refresh at a time. Several requests failing with 401 together share a
 * single call rather than each firing their own.
 */
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchanges the refresh cookie for a new access token.
 *
 * The epoch is captured before the request goes out and checked before anything
 * is written. Without that, a refresh for the previous session that is still in
 * flight when somebody signs in would land afterwards and put the previous
 * user's token back, which is exactly what a cold API makes likely.
 */
async function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const epoch = getSessionEpoch();

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setRefreshedAccessToken(null, epoch);
        return false;
      }

      const parsed = refreshResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        setRefreshedAccessToken(null, epoch);
        return false;
      }

      // False here means somebody signed in while this was in flight, so this
      // token is already out of date and the caller must not act on it.
      return setRefreshedAccessToken(parsed.data.accessToken, epoch);
    } catch {
      setRefreshedAccessToken(null, epoch);
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function requestAccessTokenRefresh(): Promise<boolean> {
  return refreshAccessToken();
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Set false for the auth routes, which must not trigger a refresh loop. */
  allowRefresh?: boolean;
};

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    return await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      credentials: "include",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the workshop. Check your connection and try again.",
    );
  }
}

async function requestRaw(path: string, options: RequestOptions = {}): Promise<Response> {
  let response = await send(path, options);

  // An expired access token is normal every 15 minutes. Refresh once, quietly,
  // and replay the request before showing anyone an error.
  if (response.status === 401 && (options.allowRefresh ?? true)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await send(path, options);
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response;
}

/** Sends the request and validates the response with the shared schema. */
export async function apiRequest<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
  options: RequestOptions = {},
): Promise<z.infer<TSchema>> {
  const response = await requestRaw(path, options);
  return schema.parse(await response.json()) as z.infer<TSchema>;
}

/** For the routes that answer 204. */
export async function apiRequestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  await requestRaw(path, options);
}

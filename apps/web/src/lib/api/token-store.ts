/**
 * The access token lives in a module variable and nowhere else. It is never
 * written to localStorage or sessionStorage, so a cross-site script cannot read
 * it back, and it disappears when the tab closes. A page reload gets a new one
 * from the refresh cookie.
 */
let accessToken: string | null = null;

/**
 * Incremented every time the session is deliberately changed, which means
 * signing in, registering or signing out.
 *
 * A silent refresh started before one of those happened belongs to the previous
 * session. On a cold API it can take tens of seconds and land long after
 * somebody has signed in as a different person, so it carries the epoch it
 * started under and is discarded if the session has moved on since.
 */
let sessionEpoch = 0;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getSessionEpoch(): number {
  return sessionEpoch;
}

/** Signing in, registering or signing out. Always wins over a refresh. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
  sessionEpoch += 1;
}

/**
 * Used only by the silent refresh. Returns false when the session moved on
 * while the request was in flight, in which case the result is thrown away.
 */
export function setRefreshedAccessToken(token: string | null, epoch: number): boolean {
  if (epoch !== sessionEpoch) {
    return false;
  }

  accessToken = token;
  return true;
}

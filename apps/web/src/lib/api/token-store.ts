/**
 * The access token lives in a module variable and nowhere else. It is never
 * written to localStorage or sessionStorage, so a cross-site script cannot read
 * it back, and it disappears when the tab closes. A page reload gets a new one
 * from the refresh cookie.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

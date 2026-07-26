import type { Role } from "@chrysmec/shared";

/**
 * Where each role lands after signing in. Staff and management get their own
 * areas in later phases; until then everyone shares the account home.
 */
export const ROLE_HOME: Record<Role, string> = {
  CLIENT: "/dashboard",
  STAFF: "/dashboard",
  MANAGEMENT: "/dashboard",
};

export function homeForRole(role: Role): string {
  return ROLE_HOME[role];
}

/**
 * Only same-origin paths are ever followed after sign in, so a crafted
 * ?next=https://elsewhere link cannot bounce someone off the site.
 */
export function safeRedirect(target: string | null, fallback: string): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return fallback;
  }
  return target;
}

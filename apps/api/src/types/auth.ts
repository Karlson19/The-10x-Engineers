import type { Role, Section } from "@chrysmec/shared";

/**
 * What the auth middleware attaches to a request after it has verified the
 * access token and confirmed the account is still active. The role here comes
 * from the database row, never from the token alone and never from the client.
 */
export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  section: Section | null;
};

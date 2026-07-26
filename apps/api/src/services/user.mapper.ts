import type { User } from "@prisma/client";
import type { PublicUser } from "@chrysmec/shared";

/**
 * The only way a user row becomes a response. Going through one mapper is what
 * stops passwordHash leaking out of a route someone adds later.
 */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    section: user.section,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

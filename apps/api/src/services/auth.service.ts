import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { LoginRequest, PublicUser, RegisterRequest } from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { toPublicUser } from "./user.mapper";

export type Session = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

/**
 * A hash of a random value nobody can log in with, computed once. Verifying
 * against it when the email is unknown keeps the response time for "no such
 * account" close to "wrong password", so the API cannot be used to find out
 * which addresses are registered.
 */
let decoyHash: Promise<string> | null = null;

function getDecoyHash(): Promise<string> {
  decoyHash ??= hashPassword(randomBytes(32).toString("hex"));
  return decoyHash;
}

function issueSession(user: {
  id: string;
  role: PublicUser["role"];
  section: PublicUser["section"];
}): Pick<Session, "accessToken" | "refreshToken"> {
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role, section: user.section }),
    refreshToken: signRefreshToken(user.id),
  };
}

/**
 * Public registration always creates a CLIENT. The input schema has no role
 * field, so there is nothing here to trust or ignore.
 */
export async function registerClient(input: RegisterRequest): Promise<Session> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: "CLIENT",
      },
    });

    return { user: toPublicUser(user), ...issueSession(user) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw HttpError.conflict("An account already uses that email address. Sign in instead.");
    }
    throw error;
  }
}

export async function login(input: LoginRequest): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  const passwordMatches = await verifyPassword(
    user?.passwordHash ?? (await getDecoyHash()),
    input.password,
  );

  if (!user || !passwordMatches) {
    throw HttpError.unauthenticated("Those details did not match an account. Check and try again.");
  }

  if (!user.isActive) {
    throw HttpError.forbidden("This account has been deactivated. Contact the workshop.");
  }

  return { user: toPublicUser(user), ...issueSession(user) };
}

/**
 * Refresh rotates the refresh token as well as the access token, so a token
 * that leaks is only useful until the real client next refreshes.
 */
export async function refreshSession(refreshToken: string | undefined): Promise<Session> {
  if (!refreshToken) {
    throw HttpError.unauthenticated("Your session has expired. Sign in again.");
  }

  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user || !user.isActive) {
    throw HttpError.unauthenticated("Your session is no longer valid. Sign in again.");
  }

  return { user: toPublicUser(user), ...issueSession(user) };
}

export async function getPublicUser(id: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw HttpError.notFound("We could not find that account.");
  }

  return toPublicUser(user);
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw HttpError.unauthenticated("Your current password is not correct.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}

import { Prisma } from "@prisma/client";
import type {
  CreateUserRequest,
  PaginationMeta,
  PublicUser,
  UpdateUserRequest,
  UserListQuery,
} from "@chrysmec/shared";
import { HttpError } from "../lib/http-error";
import { hashPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { toPublicUser } from "./user.mapper";

export type UserList = {
  data: PublicUser[];
  meta: PaginationMeta;
};

function buildWhere(query: UserListQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }
  if (query.section) {
    where.section = query.section;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
    ];
  }

  return where;
}

export async function listUsers(query: UserListQuery): Promise<UserList> {
  const where = buildWhere(query);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    data: users.map(toPublicUser),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getUserById(id: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw HttpError.notFound("We could not find that account.");
  }

  return toPublicUser(user);
}

export async function createUser(input: CreateUserRequest): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: input.role,
        section: input.role === "STAFF" ? (input.section ?? null) : null,
      },
    });

    return toPublicUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw HttpError.conflict("An account already uses that email address.");
    }
    throw error;
  }
}

export async function updateUser(id: string, input: UpdateUserRequest): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    throw HttpError.notFound("We could not find that account.");
  }

  const nextRole = input.role ?? existing.role;

  // Section and role have to stay consistent even when only one of them changes.
  const nextSection =
    nextRole === "STAFF" ? (input.section ?? existing.section) : null;

  if (nextRole === "STAFF" && !nextSection) {
    throw HttpError.badRequest("Staff must be assigned to a section.", {
      section: "Choose mechanical or electrical.",
    });
  }

  const data: Prisma.UserUpdateInput = {
    role: nextRole,
    section: nextSection,
  };

  if (input.fullName !== undefined) {
    data.fullName = input.fullName;
  }
  if (input.email !== undefined) {
    data.email = input.email;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }
  if (input.password !== undefined) {
    data.passwordHash = await hashPassword(input.password);
  }

  try {
    const user = await prisma.user.update({ where: { id }, data });
    return toPublicUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw HttpError.conflict("An account already uses that email address.");
    }
    throw error;
  }
}

/**
 * Accounts are deactivated, never deleted. Their jobs, requests and work log
 * entries are part of the workshop's record and have to stay readable.
 */
export async function deactivateUser(id: string, actingUserId: string): Promise<PublicUser> {
  if (id === actingUserId) {
    throw HttpError.badRequest("You cannot deactivate your own account.");
  }

  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    throw HttpError.notFound("We could not find that account.");
  }

  const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
  return toPublicUser(user);
}

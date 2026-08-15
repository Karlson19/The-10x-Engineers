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

/**
 * Work a technician still holds. Assigned or in progress means a vehicle is
 * sitting somewhere with their name against it.
 */
async function openJobCount(staffId: string): Promise<number> {
  return prisma.job.count({
    where: { assignedStaffId: staffId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
  });
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

  /*
    Moving somebody between sections, or out of being a technician at all, has
    to leave their current work behind. A booking may only ever be assigned to
    a technician from its own section, and changing the person's section after
    the fact walked straight around that: their open mechanical jobs simply
    followed them into electrical, where the rules say they could never have
    been given them.
  */
  const isLeavingSection =
    existing.role === "STAFF" && (nextRole !== "STAFF" || nextSection !== existing.section);

  if (isLeavingSection) {
    const open = await openJobCount(id);

    if (open > 0) {
      throw HttpError.conflict(
        `${existing.fullName} still has ${open} open ${open === 1 ? "job" : "jobs"} in ${existing.section === "MECHANICAL" ? "mechanical" : "electrical"}. Reassign ${open === 1 ? "it" : "them"} before moving them.`,
        { openJobs: open },
      );
    }
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

  /*
    Standing a technician down used to leave their open jobs exactly where they
    were: assigned to somebody who can no longer sign in, still listed as
    theirs on the management screen, and impossible for anyone else to pick up
    without noticing by eye. A vehicle in the bay with nobody who can work on
    it is the worst kind of quiet failure, so the work has to be moved first.
  */
  if (existing.role === "STAFF") {
    const open = await openJobCount(id);

    if (open > 0) {
      throw HttpError.conflict(
        `${existing.fullName} still has ${open} open ${open === 1 ? "job" : "jobs"}. Reassign ${open === 1 ? "it" : "them"} before standing them down.`,
        { openJobs: open },
      );
    }
  }

  const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
  return toPublicUser(user);
}

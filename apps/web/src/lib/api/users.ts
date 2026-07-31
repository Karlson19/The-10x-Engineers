import { z } from "zod";
import {
  type CreateUserRequest,
  type PublicUser,
  type Role,
  type Section,
  type UpdateUserRequest,
  publicUserSchema,
} from "@chrysmec/shared";
import { apiRequest } from "./client";

const userResponseSchema = z.object({ user: publicUserSchema });

const userListResponseSchema = z.object({
  data: z.array(publicUserSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type UserListResponse = z.infer<typeof userListResponseSchema>;

export type UserFilters = {
  role?: Role;
  section?: Section;
  search?: string;
};

export function fetchUsers(filters: UserFilters = {}): Promise<UserListResponse> {
  const params = new URLSearchParams({ limit: "100" });

  if (filters.role) {
    params.set("role", filters.role);
  }
  if (filters.section) {
    params.set("section", filters.section);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }

  return apiRequest(`/users?${params.toString()}`, userListResponseSchema);
}

export async function createUser(input: CreateUserRequest): Promise<PublicUser> {
  return (await apiRequest("/users", userResponseSchema, { method: "POST", body: input })).user;
}

export async function updateUser(id: string, input: UpdateUserRequest): Promise<PublicUser> {
  return (await apiRequest(`/users/${id}`, userResponseSchema, { method: "PATCH", body: input }))
    .user;
}

/** Deactivates rather than deletes, so the workshop's record stays intact. */
export async function deactivateUser(id: string): Promise<PublicUser> {
  return (await apiRequest(`/users/${id}`, userResponseSchema, { method: "DELETE" })).user;
}

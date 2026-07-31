"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateUserRequest, UpdateUserRequest } from "@chrysmec/shared";
import {
  type UserFilters,
  createUser,
  deactivateUser,
  fetchUsers,
  updateUser,
} from "@/lib/api/users";

export const USERS_KEY = ["users"] as const;

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: [...USERS_KEY, "list", filters] as const,
    queryFn: () => fetchUsers(filters),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserRequest) => createUser(input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserRequest }) => updateUser(id, input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

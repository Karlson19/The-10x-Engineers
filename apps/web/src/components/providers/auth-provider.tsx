"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LoginRequest, PublicUser, RegisterRequest } from "@chrysmec/shared";
import { login, logout, register, restoreSession } from "@/lib/api/auth";

export const AUTH_QUERY_KEY = ["auth", "session"] as const;

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: PublicUser | null;
  status: AuthStatus;
  signIn: (input: LoginRequest) => Promise<PublicUser>;
  signUp: (input: RegisterRequest) => Promise<PublicUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  /**
   * Runs once on load. The access token only lives in memory, so after a reload
   * the httpOnly refresh cookie is what brings the session back. A null result
   * means nobody is signed in, which is a normal answer rather than an error.
   */
  const session = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async (): Promise<PublicUser | null> => {
      const result = await restoreSession();
      return result?.user ?? null;
    },
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const signInMutation = useMutation({
    mutationFn: login,
    onSuccess(result) {
      queryClient.setQueryData(AUTH_QUERY_KEY, result.user);
    },
  });

  const signUpMutation = useMutation({
    mutationFn: register,
    onSuccess(result) {
      queryClient.setQueryData(AUTH_QUERY_KEY, result.user);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: logout,
    onSettled() {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      // Nothing cached belongs to the next person to use this browser.
      queryClient.clear();
    },
  });

  const signIn = useCallback(
    async (input: LoginRequest) => (await signInMutation.mutateAsync(input)).user,
    [signInMutation],
  );

  const signUp = useCallback(
    async (input: RegisterRequest) => (await signUpMutation.mutateAsync(input)).user,
    [signUpMutation],
  );

  const signOut = useCallback(async () => {
    await signOutMutation.mutateAsync();
  }, [signOutMutation]);

  const status: AuthStatus = session.isPending
    ? "loading"
    : session.data
      ? "authenticated"
      : "unauthenticated";

  const value = useMemo(
    () => ({ user: session.data ?? null, status, signIn, signUp, signOut }),
    [session.data, status, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}

"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LoginRequest, PublicUser, RegisterRequest } from "@chrysmec/shared";
import { login, logout, register, restoreSession } from "@/lib/api/auth";
import { getSessionEpoch } from "@/lib/api/token-store";
import { clearApiCache } from "@/lib/offline/api-cache";

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
   *
   * This can still be in flight when somebody signs in, and on a cold API it
   * usually is. Its answer describes the session that existed when it started,
   * so if the session has moved on since it must not be written: doing so drops
   * you into the previous account, or signs you straight back out when the old
   * cookie turns out to be dead.
   */
  const session = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async (): Promise<PublicUser | null> => {
      const epoch = getSessionEpoch();
      const result = await restoreSession();

      if (getSessionEpoch() !== epoch) {
        return queryClient.getQueryData<PublicUser | null>(AUTH_QUERY_KEY) ?? null;
      }

      return result?.user ?? null;
    },
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  /**
   * The service worker's cache of API reads belongs to whoever filled it, and
   * it survives both signing out and signing in. Emptying it on either side of
   * a session change stops a stale read being handed back before the network
   * answers, which showed people the bookings of an account they had just left.
   */
  const adoptSession = useCallback(
    async (user: PublicUser) => {
      await clearApiCache();
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
    [queryClient],
  );

  const signInMutation = useMutation({
    mutationFn: login,
    onSuccess: (result) => adoptSession(result.user),
  });

  const signUpMutation = useMutation({
    mutationFn: register,
    onSuccess: (result) => adoptSession(result.user),
  });

  const signOutMutation = useMutation({
    mutationFn: logout,
    async onSettled() {
      // Nothing cached belongs to the next person to use this browser. Clearing
      // comes first, because it would otherwise wipe the null written here and
      // leave the session query to fetch itself back again.
      queryClient.clear();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      await clearApiCache();
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

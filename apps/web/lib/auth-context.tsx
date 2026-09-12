"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, type TeacherProfile } from "@/lib/api";

interface AuthState {
  teacher: TeacherProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoggingIn: boolean;
  loginError: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_QUERY_KEY = ["auth", "me"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [loginError, setLoginError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        return await api.me();
      } catch {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      api.login(creds.email, creds.password),
    onSuccess: async (result) => {
      setLoginError(null);
      queryClient.setQueryData(AUTH_QUERY_KEY, { teacher: result.teacher });
      if (pathname === "/teacher/login") {
        router.push("/teacher");
      }
    },
    onError: (error: Error) => {
      const msg = error.message.includes("401")
        ? "Invalid email or password"
        : "Login failed. Please try again.";
      setLoginError(msg);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: ["students"] });
      queryClient.removeQueries({ queryKey: ["vocabulary"] });
      router.push("/teacher/login");
    },
  });

  const login = useCallback(
    async (email: string, password: string) => {
      setLoginError(null);
      await loginMutation.mutateAsync({ email, password });
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const value = useMemo<AuthState>(
    () => ({
      teacher: data?.teacher ?? null,
      isLoading,
      isAuthenticated: !!data?.teacher,
      login,
      logout,
      isLoggingIn: loginMutation.isPending,
      loginError,
    }),
    [data, isLoading, login, logout, loginMutation.isPending, loginError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

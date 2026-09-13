"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/teacher");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login(email, password);
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 size-80 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BrandMark light />
          <span className="text-lg font-semibold">English · Polski</span>
        </div>
        <div className="relative max-w-md space-y-4">
          <p className="text-3xl font-semibold leading-tight">
            Teach English with sense-level Polish vocabulary.
          </p>
          <p className="text-sm text-sidebar-foreground/75">
            Assign words, run flashcards, memory, quizzes and live lessons — all
            on one shared learning state.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-foreground/60">
          A1–C2 · FSRS reviews · Live teacher mirror
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3 lg:hidden">
            <BrandMark />
            <p className="text-lg font-semibold">English · Polski</p>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Teacher sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your teacher account to open the workspace.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                disabled={isLoggingIn}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
                disabled={isLoggingIn}
              />
            </div>
            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

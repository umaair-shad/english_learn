"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatWhen(value: string | null): string {
  if (!value) return "Not recorded yet";
  return new Date(value).toLocaleString();
}

export default function SettingsPage() {
  const { teacher, isLoading: authLoading, logout } = useAuth();
  const me = useQuery({
    queryKey: ["auth", "me-profile"],
    queryFn: () => api.me(),
    enabled: !!teacher,
  });
  const profile = me.data?.teacher ?? teacher;
  const isLoading = authLoading || ( !!teacher && me.isLoading);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-page-title">Settings</h1>
        <p className="app-page-lead">
          Your teacher account, password, and session.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-sky-600" />
              Account profile
            </CardTitle>
            <CardDescription>
              This platform is set up for a single teacher account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : !teacher ? (
              <p className="text-sm text-destructive">
                Could not load your profile. Sign in again.
              </p>
            ) : (
              <div className="space-y-3">
                <ProfileRow
                  icon={User}
                  label="Name"
                  value={teacher.displayName}
                />
                <ProfileRow icon={Mail} label="Email" value={teacher.email} />
                <ProfileRow
                  icon={ShieldCheck}
                  label="Last sign-in"
                  value={formatWhen(teacher.lastLoginAt)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="size-5 text-amber-600" />
              Session
            </CardTitle>
            <CardDescription>
              Sign-in lasts 15 minutes. You will need to sign in again after
              that.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use sign out when you leave a shared computer. Students keep
              their own private links and are not affected.
            </p>
            <Button variant="outline" onClick={() => void logout()}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-background px-3 py-3">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
  });

  const tooShort =
    currentPassword.length > 0 && currentPassword.length < 8;
  const newTooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const sameAsCurrent =
    newPassword.length > 0 &&
    currentPassword.length > 0 &&
    newPassword === currentPassword;
  const canSubmit =
    currentPassword.length >= 8 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    !mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-5 text-violet-600" />
          Change password
        </CardTitle>
        <CardDescription>
          Use at least 8 characters. You stay signed in after the update.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <PasswordField
            id="current-password"
            label="Current password"
            value={currentPassword}
            show={show}
            onChange={setCurrentPassword}
            hint={tooShort ? "At least 8 characters." : undefined}
          />
          <PasswordField
            id="new-password"
            label="New password"
            value={newPassword}
            show={show}
            onChange={setNewPassword}
            hint={
              newTooShort
                ? "At least 8 characters."
                : sameAsCurrent
                  ? "Choose a different password."
                  : undefined
            }
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            show={show}
            onChange={setConfirmPassword}
            hint={mismatch ? "The new passwords do not match." : undefined}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShow((v) => !v)}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {show ? "Hide passwords" : "Show passwords"}
          </Button>
          <Button disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Update password
          </Button>
          {mutation.isSuccess ? (
            <p className="text-sm text-emerald-700">Password updated.</p>
          ) : null}
          {mutation.isError ? (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error &&
              mutation.error.message.includes("401")
                ? "Current password is incorrect."
                : "Could not change the password. Try again."}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordField({
  id,
  label,
  value,
  show,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-destructive">{hint}</p> : null}
    </div>
  );
}

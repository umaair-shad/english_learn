"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, User } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.me(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your teacher account details.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Account profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ) : isError || !data ? (
            <p className="text-destructive">Could not load your profile.</p>
          ) : (
            <>
              <p className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                {data.teacher.displayName}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                {data.teacher.email}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
    },
  });

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        {mutation.isSuccess ? (
          <p className="text-sm text-emerald-600">Password updated.</p>
        ) : null}
        {mutation.isError ? (
          <p className="text-sm text-destructive">
            Could not change the password. Check the current password and try again.
          </p>
        ) : null}
        <Button
          disabled={
            currentPassword.length < 8 ||
            newPassword.length < 8 ||
            mutation.isPending
          }
          onClick={() => mutation.mutate()}
        >
          Update password
        </Button>
      </CardContent>
    </Card>
  );
}
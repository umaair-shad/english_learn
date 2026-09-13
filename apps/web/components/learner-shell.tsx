"use client";

import { BrandMark } from "@/components/brand-mark";
import { useStudentLivePresence } from "@/lib/use-student-live-presence";

export function LearnerShell({
  children,
  eyebrow,
  accessToken,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  accessToken?: string;
}) {
  useStudentLivePresence(accessToken);

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[90rem] items-center gap-3">
          <BrandMark />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold">English · Polski</p>
            <p className="truncate text-xs text-muted-foreground">
              {eyebrow ?? "Your learning space"}
            </p>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[90rem] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

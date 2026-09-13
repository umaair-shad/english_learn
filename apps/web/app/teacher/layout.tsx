"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { TeacherSidebar } from "@/components/teacher-sidebar";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Loader2, Menu } from "lucide-react";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const isLoginPage = pathname === "/teacher/login";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.push("/teacher/login");
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <div className="hidden h-svh shrink-0 lg:flex">
        <TeacherSidebar className="h-svh" />
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 max-w-[min(100%,20rem)]">
            <TeacherSidebar
              className="h-full shadow-2xl"
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-30 flex shrink-0 items-center gap-3 border-b bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
          <Button
            variant="outline"
            size="icon"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <BrandMark />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">English · Polski</p>
            <p className="text-xs text-muted-foreground">Teacher</p>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[96rem] p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

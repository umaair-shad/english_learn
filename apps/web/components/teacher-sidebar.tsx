"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useAuth } from "@/lib/auth-context";
import { BrandMark } from "@/components/brand-mark";
import {
  BookOpen,
  ClipboardList,
  ChartColumn,
  Gauge,
  Gamepad2,
  LibraryBig,
  Radio,
  Settings,
  Tags,
  Users,
  CloudUpload,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/teacher", label: "Dashboard", icon: Gauge },
  { href: "/teacher/students", label: "Students", icon: Users },
  { href: "/teacher/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/teacher/vocabulary-sets", label: "Collections", icon: LibraryBig },
  { href: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/teacher/activities", label: "Activities", icon: Gamepad2 },
  { href: "/teacher/live-monitoring", label: "Live Monitoring", icon: Radio },
  { href: "/teacher/categories", label: "Find words", icon: Tags },
  { href: "/teacher/reports", label: "Reports", icon: ChartColumn },
  { href: "/teacher/import-export", label: "Import / Export", icon: CloudUpload },
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

export function TeacherSidebar({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { teacher, logout, isAuthenticated } = useAuth();

  return (
    <aside
      className={cn(
        "flex h-full w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <BrandMark light />
        <div className="leading-tight">
          <div className="text-sm font-semibold">English · Polski</div>
          <div className="text-xs text-sidebar-foreground/70">Teacher workspace</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/teacher"
              ? pathname === "/teacher"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" />
              {label}
            </Link>
          );
        })}
      </nav>
      {isAuthenticated && teacher && (
        <div className="border-t border-sidebar-border p-4 space-y-2">
          <div className="truncate text-xs text-sidebar-foreground/70" title={teacher.email}>
            {teacher.displayName}
          </div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}

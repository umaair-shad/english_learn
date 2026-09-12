"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useAuth } from "@/lib/auth-context";
import {
  BookOpen,
  ClipboardList,
  ChartColumn,
  Gauge,
  Gamepad2,
  LibraryBig,
  Radio,
  ScrollText,
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
  { href: "/teacher/vocabulary-sets", label: "Vocabulary Sets", icon: LibraryBig },
  { href: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/teacher/activities", label: "Activities", icon: Gamepad2 },
  { href: "/teacher/live-monitoring", label: "Live Monitoring", icon: Radio },
  { href: "/teacher/categories", label: "Categories", icon: Tags },
  { href: "/teacher/reports", label: "Reports", icon: ChartColumn },
  { href: "/teacher/import-export", label: "Import / Export", icon: CloudUpload },
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

export function TeacherSidebar() {
  const pathname = usePathname();
  const { teacher, logout, isAuthenticated } = useAuth();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <ScrollText className="size-5" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">English CMS</div>
          <div className="text-xs text-muted-foreground">Teacher workspace</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/teacher" ? pathname === "/teacher" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      {isAuthenticated && teacher && (
        <div className="border-t p-3 space-y-2">
          <div className="text-xs text-muted-foreground truncate" title={teacher.email}>
            {teacher.displayName}
          </div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}

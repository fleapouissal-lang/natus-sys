"use client";

import { Sidebar } from "@/components/layout/sidebar";
import type { UserRole } from "@/lib/types";

export function DashboardShell({
  role,
  userName,
  cityLabel,
  children,
}: {
  role: UserRole;
  userName: string;
  cityLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={role} userName={userName} cityLabel={cityLabel} />
      <main className="flex-1 overflow-y-auto bg-background p-8">{children}</main>
    </div>
  );
}

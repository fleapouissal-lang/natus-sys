"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
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
  const pathname = usePathname();
  const isPos = pathname.startsWith("/cashier/pos");

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar role={role} userName={userName} cityLabel={cityLabel} />
      <main
        className={cn(
          "natus-content min-h-0 min-w-0 flex-1 bg-page",
          isPos
            ? "flex flex-col overflow-hidden p-0"
            : "overflow-y-auto p-8"
        )}
      >
        {children}
      </main>
    </div>
  );
}

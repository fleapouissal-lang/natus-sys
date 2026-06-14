"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Store,
  Receipt,
  Users,
  ShoppingCart,
  History,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { getRoleLabel, getManagementBasePath } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

function buildManagementLinks(basePath: "/director" | "/manager") {
  return [
    { href: basePath, label: "Tableau de bord", icon: LayoutDashboard },
    { href: `${basePath}/products`, label: "Produits", icon: Package },
    { href: `${basePath}/stores`, label: "Magasins", icon: Store },
    { href: `${basePath}/stock`, label: "Stock", icon: Warehouse },
    { href: `${basePath}/activity`, label: "Activité", icon: ClipboardList },
    { href: `${basePath}/sales`, label: "Ventes", icon: Receipt },
    { href: `${basePath}/users`, label: "Utilisateurs", icon: Users },
    { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart },
  ];
}

const cashierLinks = [
  { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart },
  { href: "/cashier/sales", label: "Mes ventes", icon: History },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "avatar-round flex h-10 w-10 shrink-0 items-center justify-center border border-[#B38C4A] text-sm font-semibold text-[#B38C4A]",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export function Sidebar({
  role,
  userName,
  cityLabel,
}: {
  role: UserRole;
  userName: string;
  cityLabel?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = getManagementBasePath(role);
  const links =
    role === "cashier"
      ? cashierLinks
      : basePath
        ? buildManagementLinks(basePath)
        : cashierLinks;
  const roleLabel = getRoleLabel(role);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="relative flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border">
        <div className="flex items-center border-b border-border/60 px-4 py-4">
          <Logo size="md" />
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center gap-3 px-1 py-1">
            <UserAvatar name={userName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {userName}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                {roleLabel}
              </p>
              {cityLabel && (
                <p className="truncate text-xs text-muted">{cityLabel}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {links.map(({ href, label, icon: Icon }) => {
          const isDashboard = href === "/manager" || href === "/director";
          const isActive = isDashboard
            ? pathname === href
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-transparent text-muted hover:border-primary/40 hover:bg-background hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-primary" : "text-muted group-hover:text-primary"
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 bg-danger px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

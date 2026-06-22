"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sidebarCollapsedForRoute } from "@/lib/layout/sidebar-state";
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
  ShoppingBag,
  Truck,
  PanelLeftClose,
  RotateCcw,
  Boxes,
  Gift,
  AlertTriangle,
  MessageSquare,
  FileText,
  CalendarClock,
  Newspaper,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SESSION_LAST_ACTIVITY_KEY } from "@/lib/auth/session-config";
import { cn } from "@/lib/utils";
import { getRoleLabel, getManagementBasePath } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

function buildManagementLinks(basePath: "/director" | "/manager" | "/hub") {
  if (basePath === "/hub") {
    return [
      { href: "/hub", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/hub/stock", label: "Stock magasins", icon: Warehouse },
      { href: "/hub/hub-stock", label: "Entrepôt hub", icon: Boxes },
      { href: "/hub/activity", label: "Activité", icon: ClipboardList },
      { href: "/hub/actualites", label: "Actualités", icon: Newspaper },
      { href: "/hub/invoices", label: "Factures magasins", icon: FileText },
    ];
  }

  const links = [
    { href: basePath, label: "Tableau de bord", icon: LayoutDashboard },
    { href: `${basePath}/products`, label: "Produits", icon: Package },
    { href: `${basePath}/stores`, label: "Magasins", icon: Store },
    { href: `${basePath}/stock`, label: "Stock", icon: Warehouse },
    { href: `${basePath}/activity`, label: "Activité", icon: ClipboardList },
    { href: `${basePath}/orders`, label: "Commandes", icon: ShoppingBag },
    { href: `${basePath}/reclamations`, label: "Réclamations", icon: AlertTriangle },
    { href: `${basePath}/loyalty`, label: "Fidélité", icon: Gift },
    { href: `${basePath}/sales`, label: "Ventes", icon: Receipt },
    { href: `${basePath}/invoices`, label: "Factures", icon: FileText },
    { href: `${basePath}/planning`, label: "Planning", icon: CalendarClock },
    { href: `${basePath}/actualites`, label: "Actualités", icon: Newspaper },
    { href: `${basePath}/users`, label: "Utilisateurs", icon: Users },
    { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart },
  ];

  if (basePath === "/director") {
    links.splice(6, 0, {
      href: "/director/hub",
      label: "Hub stock",
      icon: Boxes,
    });
    links.splice(10, 0, {
      href: "/director/hubs",
      label: "Comptes hub",
      icon: Users,
    });
  }

  return links;
}

const cashierLinks = [
  { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart },
  { href: "/cashier/planning", label: "Mon planning", icon: CalendarClock },
  { href: "/cashier/actualites", label: "Actualités", icon: Newspaper },
  { href: "/cashier/orders", label: "Commandes", icon: ShoppingBag },
  { href: "/cashier/notes", label: "Notes commandes", icon: MessageSquare },
  { href: "/cashier/transfers", label: "Réceptions hub", icon: Boxes },
  { href: "/cashier/customers", label: "Clients fidélité", icon: Gift },
  { href: "/cashier/returns", label: "Retours magasin", icon: RotateCcw },
  { href: "/cashier/sales", label: "Mes ventes", icon: History },
  { href: "/cashier/invoices", label: "Factures", icon: FileText },
];

const livreurLinks = [
  { href: "/livreur/orders", label: "Mes livraisons", icon: Truck },
  { href: "/livreur/actualites", label: "Actualités", icon: Newspaper },
  { href: "/livreur/returns", label: "Mes retours", icon: RotateCcw },
];

function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/manager" || href === "/director" || href === "/hub") {
    return pathname === href;
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

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
  title,
}: {
  name: string;
  className?: string;
  title?: string;
}) {
  return (
    <div
      title={title}
      className={cn(
        "avatar-round flex h-10 w-10 shrink-0 items-center justify-center border border-black bg-white/50 text-sm font-semibold text-black",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

function SidebarBrand({ collapsed }: { collapsed?: boolean }) {
  return (
    <span
      className={cn(
        "font-heading font-bold tracking-tight text-primary",
        collapsed ? "text-lg" : "text-2xl"
      )}
    >
      {collapsed ? "N" : "Natus"}
    </span>
  );
}

function SidebarToggle({
  onToggle,
  className,
}: {
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "natus-sidebar-toggle flex h-9 w-9 items-center justify-center bg-sidebar text-black/80 transition-opacity hover:opacity-85 cursor-pointer",
        className
      )}
      aria-label="Basculer la sidebar"
      title="Masquer / afficher la sidebar"
    >
      <PanelLeftClose className="h-5 w-5" />
    </button>
  );
}

function SidebarUserProfile({
  collapsed,
  userName,
  roleLabel,
  cityLabel,
}: {
  collapsed: boolean;
  userName: string;
  roleLabel: string;
  cityLabel?: string;
}) {
  if (collapsed) {
    return (
      <div className="flex w-full flex-col items-center gap-2 border-b border-black/10 px-2 py-3">
        <UserAvatar
          name={userName}
          title={[userName, roleLabel, cityLabel].filter(Boolean).join(" · ")}
        />
        <p className="max-w-full truncate text-center text-[10px] font-semibold leading-tight text-black">
          {userName.split(" ")[0]}
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-black/10 px-4 py-4">
      <div className="flex items-center gap-3 px-1 py-1">
        <UserAvatar name={userName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-black">{userName}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-black/80">
            {roleLabel}
          </p>
          {cityLabel && (
            <p className="truncate text-xs text-black/60">{cityLabel}</p>
          )}
        </div>
      </div>
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
  const [collapsed, setCollapsed] = useState(() => sidebarCollapsedForRoute(pathname));

  const basePath = getManagementBasePath(role);
  const links =
    role === "livreur"
      ? livreurLinks
      : role === "cashier"
        ? cashierLinks
        : basePath
          ? buildManagementLinks(basePath)
          : cashierLinks;
  const roleLabel = getRoleLabel(role);

  useEffect(() => {
    setCollapsed(sidebarCollapsedForRoute(pathname));
  }, [pathname]);

  useEffect(() => {
    localStorage.removeItem("natus-sidebar-collapsed");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "natus-sidebar relative flex h-full shrink-0 flex-col bg-sidebar transition-[width] duration-300 ease-in-out",
        collapsed ? "natus-sidebar--collapsed w-[4.5rem] overflow-visible" : "w-64"
      )}
      onDoubleClick={toggleCollapsed}
      title={collapsed ? "Double-clic pour agrandir" : "Double-clic pour réduire"}
    >
      {collapsed ? (
        <div className="flex shrink-0 items-center justify-between gap-1 border-b border-black/10 px-2 py-3">
          <SidebarBrand collapsed />
          <SidebarToggle onToggle={toggleCollapsed} />
        </div>
      ) : (
        <div className="relative flex shrink-0 items-center justify-between border-b border-black/10 px-4 py-5">
          <SidebarBrand />
          <SidebarToggle onToggle={toggleCollapsed} />
        </div>
      )}

      <SidebarUserProfile
        collapsed={collapsed}
        userName={userName}
        roleLabel={roleLabel}
        cityLabel={cityLabel}
      />

      <nav
        className={cn(
          "flex-1",
          collapsed ? "overflow-y-auto overflow-x-hidden px-2 py-2" : "natus-sidebar-nav overflow-visible"
        )}
      >
        <ul className={cn("m-0 list-none p-0", collapsed && "flex flex-col items-center gap-1")}>
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = isNavLinkActive(pathname, href);

            if (collapsed) {
              return (
                <li key={href} className="flex w-full justify-center">
                  <Link
                    href={href}
                    title={label}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors",
                      isActive
                        ? "bg-white text-primary shadow-sm"
                        : "text-black hover:bg-white/40"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </Link>
                </li>
              );
            }

            return (
              <li
                key={href}
                className={cn("natus-nav-item", isActive && "natus-nav-item-active")}
              >
                <Link
                  href={href}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className={cn(
                    "natus-nav-link",
                    isActive && "natus-nav-link-active"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-primary" : "text-black"
                    )}
                  />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-black/10",
          collapsed ? "flex flex-col items-center p-2" : "p-3"
        )}
      >
        <button
          onClick={handleLogout}
          onDoubleClick={(e) => e.stopPropagation()}
          title={collapsed ? "Déconnexion" : undefined}
          className={cn(
            "flex items-center bg-black text-champagne transition-opacity hover:opacity-90 cursor-pointer",
            collapsed
              ? "mx-auto h-10 w-10 justify-center rounded-[10px]"
              : "w-full gap-3 px-3 py-2.5 text-sm font-medium"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}

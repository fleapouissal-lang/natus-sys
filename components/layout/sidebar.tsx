"use client";

import { useEffect, useState } from "react";
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
  ShoppingBag,
  Truck,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Boxes,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getRoleLabel, getManagementBasePath } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

const SIDEBAR_COLLAPSED_KEY = "natus-sidebar-collapsed";

function buildManagementLinks(basePath: "/director" | "/manager") {
  const links = [
    { href: basePath, label: "Tableau de bord", icon: LayoutDashboard },
    { href: `${basePath}/products`, label: "Produits", icon: Package },
    { href: `${basePath}/stores`, label: "Magasins", icon: Store },
    { href: `${basePath}/stock`, label: "Stock", icon: Warehouse },
    { href: `${basePath}/activity`, label: "Activité", icon: ClipboardList },
    { href: `${basePath}/orders`, label: "Commandes", icon: ShoppingBag },
    { href: `${basePath}/sales`, label: "Ventes", icon: Receipt },
    { href: `${basePath}/users`, label: "Utilisateurs", icon: Users },
    { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart },
  ];

  if (basePath === "/director") {
    links.splice(6, 0, {
      href: "/director/hub",
      label: "Hub stock",
      icon: Boxes,
    });
  }

  return links;
}

const cashierLinks = [
  { href: "/cashier/pos", label: "Caisse", icon: ShoppingCart },
  { href: "/cashier/orders", label: "Commandes", icon: ShoppingBag },
  { href: "/cashier/returns", label: "Retours magasin", icon: RotateCcw },
  { href: "/cashier/sales", label: "Mes ventes", icon: History },
];

const livreurLinks = [
  { href: "/livreur/orders", label: "Mes livraisons", icon: Truck },
  { href: "/livreur/returns", label: "Mes retours", icon: RotateCcw },
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
  const [collapsed, setCollapsed] = useState(false);

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
    if (pathname.startsWith("/cashier/pos")) {
      setCollapsed(true);
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
      return;
    }
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") {
      setCollapsed(true);
    }
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
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
        <>
          <div className="flex shrink-0 flex-col items-center gap-3 px-2 py-3">
            <SidebarBrand collapsed />
            <UserAvatar name={userName} title={userName} />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed();
            }}
            className="natus-sidebar-toggle natus-sidebar-toggle--open absolute top-1/2 right-0 z-30 flex h-11 w-11 -translate-y-1/2 translate-x-1/2 items-center justify-center bg-sidebar text-black transition-opacity hover:opacity-85 cursor-pointer"
            aria-label="Agrandir la sidebar"
            title="Afficher la sidebar"
          >
            <PanelLeftOpen className="h-6 w-6" />
          </button>
        </>
      ) : (
        <div className="relative shrink-0 border-b border-black/10">
          <div className="relative flex items-center border-b border-black/10 px-4 py-5">
            <SidebarBrand />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapsed();
              }}
              className="natus-sidebar-toggle natus-sidebar-toggle--close absolute right-2 top-2 flex h-9 w-9 items-center justify-center bg-sidebar text-black/80 transition-opacity hover:opacity-85 cursor-pointer"
              aria-label="Réduire la sidebar"
              title="Masquer la sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center gap-3 px-1 py-1">
              <UserAvatar name={userName} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-black">
                  {userName}
                </p>
                <p className="text-xs font-medium uppercase tracking-wide text-black/80">
                  {roleLabel}
                </p>
                {cityLabel && (
                  <p className="truncate text-xs text-black/60">{cityLabel}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav
        className={cn(
          "flex-1",
          collapsed ? "overflow-y-auto overflow-x-hidden px-2 py-2" : "natus-sidebar-nav overflow-visible"
        )}
      >
        <ul className={cn("m-0 list-none p-0", collapsed && "flex flex-col items-center gap-1")}>
          {links.map(({ href, label, icon: Icon }) => {
            const isDashboard = href === "/manager" || href === "/director";
            const isActive = isDashboard
              ? pathname === href
              : pathname.startsWith(href);

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

      <div className={cn("shrink-0", !collapsed && "border-t border-black/10", collapsed ? "p-2" : "p-3")}>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sidebarCollapsedForRoute } from "@/lib/layout/sidebar-state";
import {
  isNavLinkActive,
  resolveNavLinks,
} from "@/lib/layout/nav-links";
import {
  LogOut,
  PanelLeftClose,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SESSION_LAST_ACTIVITY_KEY } from "@/lib/auth/session-config";
import { signOutPosOperator } from "@/lib/pos/actions";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

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
        "font-heading font-bold tracking-tight text-black",
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

function SidebarPosOperator({
  collapsed,
  posOperatorName,
  hasPosOperator,
  onSwitchCashier,
  switchingCashier = false,
}: {
  collapsed: boolean;
  posOperatorName?: string | null;
  hasPosOperator?: boolean;
  onSwitchCashier?: () => void;
  switchingCashier?: boolean;
}) {
  if (!hasPosOperator || !posOperatorName) return null;

  if (collapsed) {
    return (
      <div
        className="flex w-full flex-col items-center gap-1 border-b border-black/10 px-2 py-2"
        title={`Caissier connecté : ${posOperatorName}`}
      >
        <div className="relative">
          <UserAvatar name={posOperatorName} className="h-8 w-8 text-xs ring-2 ring-success/70" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-sidebar bg-success" />
        </div>
        <p className="max-w-full truncate text-center text-[9px] font-semibold leading-tight text-black/75">
          {posOperatorName.split(" ")[0]}
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-black/10 px-4 py-3">
      <div className="flex items-center gap-3 rounded-xl bg-black/[0.06] px-3 py-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-champagne">
          <UserRound className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">
            Caissier connecté
          </p>
          <p className="truncate text-sm font-semibold text-black">{posOperatorName}</p>
        </div>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-success shadow-[0_0_0_3px_rgba(34,197,94,0.25)]"
          aria-hidden
        />
      </div>
      {onSwitchCashier && (
        <button
          type="button"
          onClick={onSwitchCashier}
          disabled={switchingCashier}
          className="mt-2 w-full rounded-lg border border-black/15 bg-black/[0.04] px-3 py-1.5 text-xs font-semibold text-black/75 transition-colors hover:bg-black/[0.08] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Changer caissier
        </button>
      )}
    </div>
  );
}

function SidebarUserProfile({
  collapsed,
  userName,
  roleLabel,
  cityLabel,
  isStorePos = false,
}: {
  collapsed: boolean;
  userName: string;
  roleLabel: string;
  cityLabel?: string;
  isStorePos?: boolean;
}) {
  const displayRole = isStorePos ? "Caisse magasin" : roleLabel;
  if (collapsed) {
    return (
      <div className="flex w-full flex-col items-center gap-2 border-b border-black/10 px-2 py-3">
        <UserAvatar
          name={userName}
          title={[userName, displayRole, cityLabel].filter(Boolean).join(" · ")}
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
            {displayRole}
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
  isStorePos = false,
  isPersonalCashier = false,
  hasPosOperator = false,
  posOperatorName,
}: {
  role: UserRole;
  userName: string;
  cityLabel?: string;
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
  posOperatorName?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(() => sidebarCollapsedForRoute(pathname));
  const [switchingCashier, setSwitchingCashier] = useState(false);

  const links = resolveNavLinks({
    role,
    isStorePos,
    isPersonalCashier,
    hasPosOperator,
    planningOnlyNav: false,
  });
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

  async function handleSwitchCashier() {
    if (!isStorePos || switchingCashier) return;
    setSwitchingCashier(true);
    await signOutPosOperator();
    router.push("/cashier/pos?switch=1");
    router.refresh();
    setSwitchingCashier(false);
  }

  async function handleLogout() {
    if (isStorePos) {
      await signOutPosOperator();
    }

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
        isStorePos={isStorePos}
      />

      {isStorePos && (
        <SidebarPosOperator
          collapsed={collapsed}
          posOperatorName={posOperatorName}
          hasPosOperator={hasPosOperator}
          onSwitchCashier={handleSwitchCashier}
          switchingCashier={switchingCashier}
        />
      )}

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

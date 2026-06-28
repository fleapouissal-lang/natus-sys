"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isCashierPosRoute } from "@/lib/layout/sidebar-state";
import {
  isNavLinkActive,
  resolveNavLinks,
  resolveDirectorNavSections,
} from "@/lib/layout/nav-links";
import type { NavLinkItem } from "@/lib/layout/nav-links";
import {
  LogOut,
  PanelLeftClose,
  Clock,
  ScrollText,
} from "lucide-react";
import { performClientLogout } from "@/lib/auth/client-logout";
import { signOutPosOperator } from "@/lib/pos/actions";
import { PosDayClosureModal } from "@/components/pos/pos-day-closure-modal";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/permissions";
import { getSettingsPath } from "@/lib/layout/settings-path";
import type { UserRole } from "@/lib/types";
import { UserAvatar } from "@/components/ui/user-avatar";

function formatSidebarClock(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SidebarCashierClock({ collapsed }: { collapsed: boolean }) {
  const [timeLabel, setTimeLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setTimeLabel(formatSidebarClock(new Date()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const displayTime = timeLabel ?? "--:--:--";
  const clockTitle = timeLabel ? `Heure actuelle · ${timeLabel}` : "Heure actuelle";

  if (collapsed) {
    return (
      <div
        className="flex justify-center border-b border-black/10 px-2 py-2"
        title={clockTitle}
      >
        <Clock className="h-4 w-4 text-black/70" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-start gap-2 px-4 py-1">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-black/70" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-black/55">
          Heure actuelle
        </p>
        <p className="truncate text-sm font-semibold tabular-nums text-black/85">{displayTime}</p>
      </div>
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
      aria-label="Masquer ou afficher la sidebar"
      title="Masquer / afficher la sidebar"
    >
      <PanelLeftClose className="h-5 w-5" />
    </button>
  );
}

function SidebarUserProfile({
  collapsed,
  userName,
  avatarUrl,
  roleLabel,
  subtitle,
  settingsHref,
  showOnlineIndicator = false,
  onSwitchCashier,
  switchingCashier = false,
}: {
  collapsed: boolean;
  userName: string;
  avatarUrl?: string | null;
  roleLabel: string;
  subtitle?: string;
  settingsHref: string;
  showOnlineIndicator?: boolean;
  onSwitchCashier?: () => void;
  switchingCashier?: boolean;
}) {
  if (collapsed) {
    return (
      <Link
        href={settingsHref}
        className="flex w-full flex-col items-center gap-2 border-b border-black/10 px-2 py-3 transition-colors hover:bg-black/[0.04]"
        title="Paramètres du profil"
      >
        <div className="relative">
          <UserAvatar
            name={userName}
            avatarUrl={avatarUrl}
            title={[userName, roleLabel, subtitle].filter(Boolean).join(" · ")}
            className={showOnlineIndicator ? "ring-2 ring-success/70" : undefined}
          />
          {showOnlineIndicator && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-sidebar bg-success" />
          )}
        </div>
        <p className="max-w-full truncate text-center text-[10px] font-semibold leading-tight text-black">
          {userName.split(" ")[0]}
        </p>
      </Link>
    );
  }

  return (
    <div className="border-b border-black/10 px-4 py-4">
      <Link
        href={settingsHref}
        className="flex items-center gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-black/[0.04]"
        title="Paramètres du profil"
      >
        <div className="relative shrink-0">
          <UserAvatar name={userName} avatarUrl={avatarUrl} />
          {showOnlineIndicator && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-sidebar bg-success shadow-[0_0_0_3px_rgba(34,197,94,0.25)]"
              aria-hidden
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-black">{userName}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-black/80">
            {roleLabel}
          </p>
          {subtitle && (
            <p className="truncate text-xs text-black/60">{subtitle}</p>
          )}
        </div>
      </Link>
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

export function Sidebar({
  role,
  userName,
  avatarUrl,
  cityLabel,
  storeName,
  storeId,
  isStorePos = false,
  isPersonalCashier = false,
  hasPosOperator = false,
  posOperatorName,
  posOperatorAvatarUrl,
  accessPreset,
  allowedPages,
  requireManagerCode = true,
}: {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
  cityLabel?: string;
  storeName?: string;
  storeId?: string | null;
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
  posOperatorName?: string | null;
  posOperatorAvatarUrl?: string | null;
  accessPreset?: string | null;
  allowedPages?: string[] | null;
  requireManagerCode?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathnameRef = useRef(pathname);
  const isPos = isCashierPosRoute(pathname);
  const [collapsed, setCollapsed] = useState(() => isPos);
  const [switchingCashier, setSwitchingCashier] = useState(false);
  const [showDayClosure, setShowDayClosure] = useState(false);

  const links = resolveNavLinks({
    role,
    accessPreset,
    allowedPages,
    isStorePos,
    isPersonalCashier,
    hasPosOperator,
    planningOnlyNav: false,
    requireManagerCode,
  });
  const navSections = resolveDirectorNavSections({ role, allowedPages, accessPreset });
  const roleLabel = getRoleLabel(role);
  const operatorActive = isStorePos && hasPosOperator && Boolean(posOperatorName);
  const profileName = operatorActive ? posOperatorName! : userName;
  const profileAvatar = operatorActive ? posOperatorAvatarUrl : avatarUrl;
  const profileRole = operatorActive
    ? "Caissier"
    : isStorePos
      ? "Caisse magasin"
      : roleLabel;
  const profileSubtitle = storeName || cityLabel;
  const showStoreClosure = role === "cashier" && Boolean(storeId);

  useEffect(() => {
    const previousPath = prevPathnameRef.current;
    const enteringPos = isCashierPosRoute(pathname);
    const leavingPos = isCashierPosRoute(previousPath) && !enteringPos;

    if (enteringPos) {
      setCollapsed(true);
    } else if (leavingPos) {
      setCollapsed(false);
    }

    prevPathnameRef.current = pathname;
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  function handleSidebarDoubleClick() {
    toggleCollapsed();
  }

  async function handleSwitchCashier() {
    if (!isStorePos || switchingCashier) return;
    setSwitchingCashier(true);
    await signOutPosOperator();
    router.replace("/cashier/pos?switch=1");
    setSwitchingCashier(false);
  }

  async function handleLogout() {
    await performClientLogout({ isStorePos });
  }

  function renderExpandedLink({ href, label, icon: Icon }: NavLinkItem) {
    const isActive = isNavLinkActive(pathname, href);
    return (
      <li
        key={href}
        className={cn("natus-nav-item", isActive && "natus-nav-item-active")}
      >
        <Link
          href={href}
          onDoubleClick={(e) => e.stopPropagation()}
          className={cn("natus-nav-link", isActive && "natus-nav-link-active")}
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
  }

  function renderCollapsedLink({ href, label, icon: Icon }: NavLinkItem) {
    const isActive = isNavLinkActive(pathname, href);
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
    <aside
      className={cn(
        "natus-sidebar relative flex h-full shrink-0 flex-col bg-sidebar transition-[width] duration-300 ease-in-out",
        collapsed ? "natus-sidebar--collapsed w-[4.5rem] overflow-visible" : "w-64"
      )}
      onDoubleClick={handleSidebarDoubleClick}
      title={
        isPos
          ? collapsed
            ? "Double-clic pour agrandir le menu"
            : "Double-clic pour réduire le menu"
          : collapsed
            ? "Double-clic pour agrandir"
            : "Double-clic pour réduire"
      }
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
        userName={profileName}
        avatarUrl={profileAvatar}
        roleLabel={profileRole}
        subtitle={profileSubtitle}
        settingsHref={getSettingsPath(role)}
        showOnlineIndicator={operatorActive}
        onSwitchCashier={operatorActive ? handleSwitchCashier : undefined}
        switchingCashier={switchingCashier}
      />

      {role === "cashier" && <SidebarCashierClock collapsed={collapsed} />}

      <nav
        className={cn(
          "min-h-0 flex-1",
          collapsed
            ? "overflow-y-auto overflow-x-hidden px-2 py-2 scrollbar-natus"
            : "natus-sidebar-nav scrollbar-natus"
        )}
      >
        {navSections ? (
          collapsed ? (
            <ul className="m-0 flex list-none flex-col items-center gap-1 p-0">
              {navSections.flatMap((section) => section.links).map(renderCollapsedLink)}
            </ul>
          ) : (
            <div className="flex flex-col gap-4">
              {navSections.map((section) => (
                <div key={section.id}>
                  <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-black/45">
                    {section.label}
                  </p>
                  <ul className="m-0 list-none p-0">
                    {section.links.map(renderExpandedLink)}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : (
          <ul className={cn("m-0 list-none p-0", collapsed && "flex flex-col items-center gap-1")}>
            {(collapsed ? links.map(renderCollapsedLink) : links.map(renderExpandedLink))}
          </ul>
        )}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-black/10",
          collapsed ? "flex flex-col items-center gap-2 p-2" : "space-y-2 p-3"
        )}
      >
        {showStoreClosure && (
          <button
            type="button"
            onClick={() => setShowDayClosure(true)}
            onDoubleClick={(e) => e.stopPropagation()}
            title={collapsed ? "Clôture du jour" : undefined}
            className={cn(
              "flex items-center bg-champagne text-black transition-opacity hover:opacity-90 cursor-pointer",
              collapsed
                ? "mx-auto h-10 w-10 justify-center rounded-[10px]"
                : "w-full gap-3 px-3 py-2.5 text-sm font-medium"
            )}
          >
            <ScrollText className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Clôture du jour</span>}
          </button>
        )}
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

      {showStoreClosure && storeId && (
        <PosDayClosureModal
          open={showDayClosure}
          onClose={() => setShowDayClosure(false)}
          storeId={storeId}
          storeName={storeName}
          cashierName={profileName}
          isStorePos={isStorePos}
        />
      )}
    </aside>
  );
}

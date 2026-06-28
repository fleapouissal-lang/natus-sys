"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MoreHorizontal } from "lucide-react";
import { performClientLogout } from "@/lib/auth/client-logout";
import {
  isNavLinkActive,
  pickMobileBottomLinks,
  pickMobileOverflowLinks,
  resolveNavLinks,
} from "@/lib/layout/nav-links";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Logo } from "@/components/ui/logo";
import type { UserRole } from "@/lib/types";
import { isMobileBottomNavVisible, isMobilePosDesktopOnlyRole } from "@/lib/layout/mobile-planning";
import { isCashierPosRoute } from "@/lib/layout/sidebar-state";

export function MobileTopBar({
  userName,
  avatarUrl,
  settingsHref,
  subtitle,
  isStorePos = false,
  alwaysVisible = false,
}: {
  userName: string;
  avatarUrl?: string | null;
  settingsHref: string;
  subtitle?: string | null;
  isStorePos?: boolean;
  alwaysVisible?: boolean;
}) {
  async function handleLogout() {
    await performClientLogout({ isStorePos });
  }

  return (
    <header
      className={cn(
        "natus-mobile-topbar-shell shrink-0",
        !alwaysVisible && "md:hidden"
      )}
    >
      <div className="natus-mobile-topbar-pill">
        <div className="natus-mobile-topbar-brand min-w-0 flex flex-1 items-center gap-2.5">
          <Logo size="sm" className="natus-mobile-topbar-mark h-9 w-9" />
          <div className="min-w-0">
            <p className="natus-mobile-topbar-logo">Natus</p>
            {subtitle ? (
              <p className="natus-mobile-topbar-subtitle">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="natus-mobile-topbar-actions flex shrink-0 items-center gap-2">
          <Link href={settingsHref} title="Paramètres">
            <UserAvatar
              name={userName}
              avatarUrl={avatarUrl}
              title={userName}
              size="sm"
              className="natus-mobile-topbar-avatar"
            />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="natus-mobile-topbar-action"
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav({
  role,
  isStorePos = false,
  isPersonalCashier = false,
  hasPosOperator = false,
  accessPreset,
  allowedPages,
  hidden = false,
  requireManagerCode = true,
}: {
  role: UserRole;
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
  accessPreset?: string | null;
  allowedPages?: string[] | null;
  hidden?: boolean;
  requireManagerCode?: boolean;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreSheetRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    function closeMore() {
      setMoreOpen(false);
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (moreSheetRef.current?.contains(target)) return;
      if (moreButtonRef.current?.contains(target)) return;
      closeMore();
    }

    function handleScroll(event: Event) {
      const target = event.target as Node;
      if (moreSheetRef.current?.contains(target)) return;
      closeMore();
    }

    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [moreOpen]);

  const allLinks = resolveNavLinks({
    role,
    accessPreset,
    allowedPages,
    isStorePos,
    isPersonalCashier,
    hasPosOperator,
    planningOnlyNav: isPersonalCashier || isStorePos,
    hideMobilePos: isMobilePosDesktopOnlyRole(role),
    requireManagerCode,
  });

  if (
    hidden ||
    !isMobileBottomNavVisible({ isStorePos, isPersonalCashier, hasPosOperator }) ||
    isCashierPosRoute(pathname)
  ) {
    return null;
  }

  const primaryLinks = pickMobileBottomLinks(allLinks, 4);
  const overflowLinks = pickMobileOverflowLinks(allLinks, primaryLinks);

  return (
    <>
      {moreOpen && overflowLinks.length > 0 && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden
        />
      )}

      {moreOpen && overflowLinks.length > 0 && (
        <div
          ref={moreSheetRef}
          className="natus-mobile-nav-more-sheet fixed bottom-[calc(var(--natus-mobile-nav-height)+env(safe-area-inset-bottom,0px)+0.5rem)] left-4 right-4 z-50 p-2 md:hidden"
        >
          <p className="natus-mobile-nav-more-title px-3 py-2">
            Menu
          </p>
          <div className="natus-mobile-nav-more-list scrollbar-natus">
            <ul className="m-0 list-none p-0">
              {overflowLinks.map(({ href, label, icon: Icon }) => {
                const isActive = isNavLinkActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "natus-mobile-nav-more-item flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "natus-mobile-nav-more-item--active"
                          : "text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full",
                          isActive ? "bg-champagne text-black" : "bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                      </span>
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="natus-mobile-bottom-nav-shell md:hidden">
        <nav
          className="natus-mobile-bottom-nav overflow-hidden rounded-t-[1.5rem] rounded-b-none"
          aria-label="Navigation mobile"
        >
          <ul className="natus-mobile-bottom-nav-list">
            {primaryLinks.map(({ href, label, icon: Icon }) => {
              const isActive = isNavLinkActive(pathname, href);
              return (
                <li key={href} className="min-w-0 flex-1">
                  <Link
                    href={href}
                    className={cn(
                      "natus-mobile-nav-link",
                      isActive && "natus-mobile-nav-link--active"
                    )}
                  >
                    <span className="natus-mobile-nav-icon">
                      <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
                    </span>
                    <span className="max-w-full truncate px-0.5">{label}</span>
                  </Link>
                </li>
              );
            })}

            {overflowLinks.length > 0 && (
              <li className="min-w-0 flex-1">
                <button
                  ref={moreButtonRef}
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  className={cn(
                    "natus-mobile-nav-link w-full",
                    moreOpen && "natus-mobile-nav-link--active"
                  )}
                >
                  <span className="natus-mobile-nav-icon">
                    <MoreHorizontal className="h-[1.125rem] w-[1.125rem] shrink-0" />
                  </span>
                  <span>Plus</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </>
  );
}

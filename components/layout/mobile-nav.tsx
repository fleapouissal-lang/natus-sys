"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SESSION_LAST_ACTIVITY_KEY } from "@/lib/auth/session-config";
import { signOutPosOperator } from "@/lib/pos/actions";
import {
  isNavLinkActive,
  pickMobileBottomLinks,
  pickMobileOverflowLinks,
  resolveNavLinks,
} from "@/lib/layout/nav-links";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { UserRole } from "@/lib/types";
import { isMobilePlanningOnlyMode, isMobileBottomNavVisible } from "@/lib/layout/mobile-planning";

export function MobileTopBar({
  userName,
  subtitle,
  isStorePos = false,
  alwaysVisible = false,
}: {
  userName: string;
  subtitle?: string | null;
  isStorePos?: boolean;
  alwaysVisible?: boolean;
}) {
  const router = useRouter();

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
    <header
      className={cn(
        "natus-mobile-topbar flex shrink-0 items-center justify-between gap-3 border-b border-black/10 bg-sidebar px-4 py-3",
        !alwaysVisible && "md:hidden"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-heading text-xl font-bold leading-tight text-primary">Natus</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[11px] text-black/55">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <UserAvatar name={userName} title={userName} />
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-black text-champagne"
          aria-label="Déconnexion"
          title="Déconnexion"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export function MobileBottomNav({
  role,
  isStorePos = false,
  isPersonalCashier = false,
  hasPosOperator = false,
}: {
  role: UserRole;
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const allLinks = resolveNavLinks({
    role,
    isStorePos,
    isPersonalCashier,
    hasPosOperator,
  });

  if (!isMobileBottomNavVisible({ isStorePos, isPersonalCashier, hasPosOperator })) {
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
          className="natus-mobile-nav-more-sheet fixed bottom-[calc(var(--natus-mobile-nav-height)+var(--natus-mobile-nav-shell-padding)+var(--natus-mobile-nav-gap)+env(safe-area-inset-bottom,0px)+0.5rem)] left-4 right-4 z-50 p-2 md:hidden"
        >
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            Plus
          </p>
          <ul className="m-0 list-none p-0">
            {overflowLinks.map(({ href, label, icon: Icon }) => {
              const isActive = isNavLinkActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-champagne/50 text-black"
                        : "text-foreground hover:bg-champagne/25"
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
      )}

      <div className="natus-mobile-bottom-nav-shell md:hidden">
        <nav className="natus-mobile-bottom-nav" aria-label="Navigation mobile">
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

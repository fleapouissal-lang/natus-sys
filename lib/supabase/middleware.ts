import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getHomePath } from "@/lib/permissions";
import { isRouteAllowedForProfile } from "@/lib/access-presets";
import { applySecurityHeaders } from "@/lib/security/headers";
import { asSessionCookieOptions } from "@/lib/supabase/session-cookies";
import { getCashierMobileRedirectPath } from "@/lib/cashier/mobile-access";
import { isMobileUserAgent } from "@/lib/layout/mobile-request";
import {
  getMobilePosRedirectPath,
  isMobilePosDesktopOnlyRole,
} from "@/lib/layout/mobile-planning";
import { isCashierPosRoute } from "@/lib/layout/sidebar-state";
import { resolveStaffHomePath } from "@/lib/cashier/access";
import type { UserRole } from "@/lib/types";

const STAFF_ROLES: UserRole[] = ["cashier", "manager", "directeur", "admin", "hub"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, asSessionCookieOptions(options))
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/EN${pathname.slice(3)}`;
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  const isAuthRoute = pathname.startsWith("/login");
  const isProtected =
    pathname.startsWith("/manager") ||
    pathname.startsWith("/director") ||
    pathname.startsWith("/hub") ||
    pathname.startsWith("/cashier") ||
    pathname.startsWith("/livreur") ||
    pathname.startsWith("/pos");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, city, is_store_pos, store_id, access_preset, allowed_pages")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;
    const homePath = role && profile ? getHomePath(role, profile) : "/login";

    if (isAuthRoute && role && profile) {
      const url = request.nextUrl.clone();
      url.pathname = await resolveStaffHomePath(supabase, profile, {
        isMobile: isMobileUserAgent(request.headers.get("user-agent")),
      });
      return applySecurityHeaders(NextResponse.redirect(url));
    }

    if (pathname.startsWith("/director")) {
      if ((role !== "directeur" && role !== "admin") || !profile?.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = role ? homePath : "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }

    if (pathname.startsWith("/hub")) {
      if (role !== "hub" || !profile?.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = role ? homePath : "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }

    if (pathname.startsWith("/manager")) {
      if (role !== "manager" || !profile?.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = role ? homePath : "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }

      if (
        pathname.startsWith("/manager/loyalty") ||
        pathname.startsWith("/manager/invoices")
      ) {
        const url = request.nextUrl.clone();
        url.pathname = homePath;
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }

    if (pathname.startsWith("/livreur")) {
      if (role !== "livreur" || !profile?.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = role ? homePath : "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }

    if (pathname.startsWith("/cashier")) {
      if (!profile?.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }

      if (role === "livreur") {
        const url = request.nextUrl.clone();
        url.pathname = getHomePath("livreur");
        return applySecurityHeaders(NextResponse.redirect(url));
      }

      if (!role || !STAFF_ROLES.includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }

      if (isCashierPosRoute(pathname) && role === "manager") {
        const url = request.nextUrl.clone();
        url.pathname = homePath;
        return applySecurityHeaders(NextResponse.redirect(url));
      }

      const isMobile = isMobileUserAgent(request.headers.get("user-agent"));
      if (
        isMobile &&
        role &&
        isMobilePosDesktopOnlyRole(role) &&
        isCashierPosRoute(pathname)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = getMobilePosRedirectPath(role);
        return applySecurityHeaders(NextResponse.redirect(url));
      }

      if (role === "cashier" && profile) {
        const mobileRedirect = await getCashierMobileRedirectPath(
          supabase,
          profile,
          pathname,
          request.headers.get("user-agent")
        );

        if (mobileRedirect) {
          const url = request.nextUrl.clone();
          url.pathname = mobileRedirect;
          return applySecurityHeaders(NextResponse.redirect(url));
        }
      }
    }

    if (
      profile?.is_active &&
      role &&
      isProtected &&
      !isRouteAllowedForProfile(pathname, profile)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = homePath;
      return applySecurityHeaders(NextResponse.redirect(url));
    }
  }

  return applySecurityHeaders(supabaseResponse);
}

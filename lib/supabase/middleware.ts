import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getHomePath } from "@/lib/permissions";
import { applySecurityHeaders } from "@/lib/security/headers";
import { asSessionCookieOptions } from "@/lib/supabase/session-cookies";
import {
  CASHIER_PLANNING_PATH,
  isCashierPlanningRoute,
  isPersonalCashierPlanningMode,
  resolveStaffHomePath,
} from "@/lib/cashier/access";
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
      .select("role, is_active, city, is_store_pos, store_id")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;

    if (isAuthRoute && role && profile) {
      const url = request.nextUrl.clone();
      url.pathname = await resolveStaffHomePath(supabase, profile);
      return applySecurityHeaders(NextResponse.redirect(url));
    }

    if (pathname.startsWith("/director")) {
      if ((role !== "directeur" && role !== "admin") || !profile?.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = role ? getHomePath(role) : "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }

    if (pathname.startsWith("/hub")) {
      if (role !== "hub" || !profile?.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = role ? getHomePath(role) : "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }

    if (pathname.startsWith("/manager")) {
      if (role !== "manager" || !profile?.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = role ? getHomePath(role) : "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }

    if (pathname.startsWith("/livreur")) {
      if (role !== "livreur" || !profile?.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = role ? getHomePath(role) : "/login";
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

      if (
        role === "cashier" &&
        profile &&
        (await isPersonalCashierPlanningMode(supabase, profile)) &&
        !isCashierPlanningRoute(pathname)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = CASHIER_PLANNING_PATH;
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }
  }

  return applySecurityHeaders(supabaseResponse);
}

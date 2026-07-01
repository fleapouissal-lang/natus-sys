import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Sous-domaines publics dédiés :
 *   - reclamations.* : page de réclamation uniquement, PWA désactivée.
 *   - loyalty.*      : espace carte fidélité uniquement, PWA active.
 *   - pro.*          : espace client pro uniquement, PWA active.
 *
 * Sur chacun de ces hosts, seul l'espace concerné est exposé (le reste de
 * l'application n'est pas accessible). Sur le domaine principal, ces espaces
 * sont au contraire bloqués et redirigés vers leur sous-domaine dédié.
 */
function hostnameOf(request: NextRequest): string {
  return (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
}

function baseDomainOf(host: string): string {
  const labels = host.split(".");
  return labels.length > 2 ? labels.slice(1).join(".") : host;
}

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" || host.endsWith(".localhost") || /^[0-9.]+$/.test(host)
  );
}

/** Origine de l'application principale (pour renvoyer le trafic hors-périmètre). */
function appOrigin(host: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  return `https://os.${baseDomainOf(host)}`;
}

export async function proxy(request: NextRequest) {
  const host = hostnameOf(request);
  const { pathname, search } = request.nextUrl;

  // --- Sous-domaine réclamations (page unique, PWA désactivée) ---
  if (host.startsWith("reclamations.")) {
    if (
      pathname === "/reclamation" ||
      pathname.startsWith("/reclamation/") ||
      pathname.startsWith("/api/reclamation")
    ) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/reclamation";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  // --- Sous-domaine espace fidélité (PWA active) ---
  if (host.startsWith("loyalty.")) {
    if (
      pathname.startsWith("/carte/") ||
      pathname.startsWith("/api/loyalty/") ||
      pathname.startsWith("/f/")
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(`${appOrigin(host)}${pathname}${search}`));
  }

  // --- Sous-domaine espace client pro (PWA active) ---
  // Sert l'inscription pro et la carte/espace des clients pro (/carte).
  if (host.startsWith("pro.")) {
    if (
      pathname.startsWith("/client-pro/") ||
      pathname.startsWith("/carte/") ||
      pathname.startsWith("/api/loyalty/") ||
      pathname.startsWith("/f/")
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(`${appOrigin(host)}${pathname}${search}`));
  }

  // --- Domaine principal : ces espaces ne sont accessibles que via leur
  // sous-domaine dédié.
  if (!isLocalHost(host)) {
    const base = baseDomainOf(host);
    if (pathname === "/reclamation" || pathname.startsWith("/reclamation/")) {
      return NextResponse.redirect(new URL(`https://reclamations.${base}/`));
    }
    if (pathname.startsWith("/carte/")) {
      return NextResponse.redirect(new URL(`https://loyalty.${base}${pathname}${search}`));
    }
    if (pathname.startsWith("/client-pro/")) {
      return NextResponse.redirect(new URL(`https://pro.${base}${pathname}${search}`));
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|api/health|api/product-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

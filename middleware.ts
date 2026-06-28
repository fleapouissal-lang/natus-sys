import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Sous-domaine dédié à la page publique de réclamation
 * (ex. reclamations.natusmarrakech.com). Sur ce host, seul le formulaire de
 * réclamation est exposé — le reste de l'application n'est pas accessible.
 */
function isReclamationsHost(request: NextRequest): boolean {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  return host.startsWith("reclamations.");
}

export async function middleware(request: NextRequest) {
  if (isReclamationsHost(request)) {
    const { pathname } = request.nextUrl;

    // Seuls la page réclamation et son API sont servis sur ce sous-domaine.
    if (
      pathname === "/reclamation" ||
      pathname.startsWith("/reclamation/") ||
      pathname.startsWith("/api/reclamation")
    ) {
      return NextResponse.next();
    }

    // Tout le reste est réécrit vers la page réclamation (pas d'accès au site).
    const url = request.nextUrl.clone();
    url.pathname = "/reclamation";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  // Sur le domaine principal, la page réclamation est bloquée : elle n'est
  // accessible que via le sous-domaine dédié (reclamations.*).
  const { pathname } = request.nextUrl;
  if (pathname === "/reclamation" || pathname.startsWith("/reclamation/")) {
    const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
    const isLocalHost =
      host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
    if (!isLocalHost) {
      const labels = host.split(".");
      const baseDomain = labels.length > 2 ? labels.slice(1).join(".") : host;
      return NextResponse.redirect(new URL(`https://reclamations.${baseDomain}/`));
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|api/health|api/product-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

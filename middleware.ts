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

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|api/health|api/product-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

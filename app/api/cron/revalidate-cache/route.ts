import { NextRequest, NextResponse } from "next/server";
import { revalidateAppCache } from "@/lib/cron/revalidate-app-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Vide le cache Next.js (revalidation des pages caisse / commandes). */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const result = revalidateAppCache();
  console.log("[cron] revalidate-cache:", result);

  return NextResponse.json({
    ok: true,
    ...result,
    at: new Date().toISOString(),
  });
}

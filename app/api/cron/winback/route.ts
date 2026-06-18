import { NextRequest, NextResponse } from "next/server";
import { processWinbackReminders } from "@/lib/marketing/send-marketing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const result = await processWinbackReminders();
  console.log("[cron] winback:", result);

  return NextResponse.json({
    ok: true,
    ...result,
    at: new Date().toISOString(),
  });
}

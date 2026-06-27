import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("auto_close_all_stores_missing_days");

  if (error) {
    console.error("[cron] store-day-closure:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[cron] store-day-closure:", data);

  return NextResponse.json({
    ok: true,
    result: data,
    at: new Date().toISOString(),
  });
}

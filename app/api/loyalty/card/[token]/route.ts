import { NextRequest, NextResponse } from "next/server";
import { getPublicLoyaltyCustomer } from "@/lib/loyalty/customers";
import { applyPrivateCacheHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = await getPublicLoyaltyCustomer(token);

  if (!data) {
    return applyPrivateCacheHeaders(
      NextResponse.json({ error: "Carte introuvable" }, { status: 404 })
    );
  }

  return applyPrivateCacheHeaders(
    NextResponse.json({
      customer: data.customer,
      transactions: data.transactions,
    })
  );
}

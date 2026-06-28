import { NextRequest, NextResponse } from "next/server";
import { getPublicCustomerOrderDetail } from "@/lib/loyalty/customer-sales.server";
import { applyPrivateCacheHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; saleId: string }> }
) {
  const { token, saleId } = await params;
  const order = await getPublicCustomerOrderDetail(token, saleId);

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  return applyPrivateCacheHeaders(NextResponse.json({ order }));
}

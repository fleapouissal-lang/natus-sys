import { NextRequest, NextResponse } from "next/server";
import { getPublicCustomerOrders } from "@/lib/loyalty/customer-sales.server";
import { applyPrivateCacheHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const orders = await getPublicCustomerOrders(token);

  return applyPrivateCacheHeaders(NextResponse.json({ orders }));
}

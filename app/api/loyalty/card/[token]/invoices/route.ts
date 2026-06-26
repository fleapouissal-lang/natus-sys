import { NextRequest, NextResponse } from "next/server";
import { getPublicCustomerInvoices } from "@/lib/loyalty/customers";
import { applyPrivateCacheHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invoices = await getPublicCustomerInvoices(token);

  return applyPrivateCacheHeaders(NextResponse.json({ invoices }));
}

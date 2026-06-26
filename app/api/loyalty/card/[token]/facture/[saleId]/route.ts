import { NextRequest, NextResponse } from "next/server";
import { getPublicCustomerInvoice } from "@/lib/loyalty/customers";
import { applyPrivateCacheHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; saleId: string }> }
) {
  const { token, saleId } = await params;
  const invoice = await getPublicCustomerInvoice(token, saleId);

  if (!invoice) {
    return applyPrivateCacheHeaders(
      NextResponse.json({ error: "Facture introuvable" }, { status: 404 })
    );
  }

  return applyPrivateCacheHeaders(NextResponse.json({ invoice }));
}

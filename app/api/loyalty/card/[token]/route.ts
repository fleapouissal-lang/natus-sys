import { NextRequest, NextResponse } from "next/server";
import { getPublicLoyaltyCustomer } from "@/lib/loyalty/customers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = await getPublicLoyaltyCustomer(token);

  if (!data) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    customer: {
      id: data.customer.id,
      full_name: data.customer.full_name,
      card_number: data.customer.card_number,
      loyalty_points: data.customer.loyalty_points,
      card_variant: data.customer.card_variant ?? "champagne",
      qr_token: data.customer.qr_token,
      created_at: data.customer.created_at,
    },
    transactions: data.transactions,
  });
}

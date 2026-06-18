import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { handleShopifyOrderConfirmButton } from "@/lib/kapso/shopify-order-whatsapp";
import { resolveShortLink } from "@/lib/short-url";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const link = await resolveShortLink(code);

  if (!link || link.kind !== "order") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const token = link.token;
  const result = await handleShopifyOrderConfirmButton(token);

  revalidatePath("/manager/orders");
  revalidatePath("/director/orders");
  revalidatePath("/cashier/orders");

  const redirectUrl = new URL(`/commande/${token}`, request.url);
  if (result.confirmed) {
    redirectUrl.searchParams.set("confirmed", "1");
  } else if (result.alreadyConfirmed) {
    redirectUrl.searchParams.set("confirmed", "already");
  }

  return NextResponse.redirect(redirectUrl);
}

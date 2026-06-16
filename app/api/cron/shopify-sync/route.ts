import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runShopifyOrdersSync } from "@/lib/shopify/sync-orders";

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

  const result = await runShopifyOrdersSync(100);

  if (!result.success) {
    console.error("Shopify cron sync:", result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  revalidatePath("/director/orders");
  revalidatePath("/director/hub");
  revalidatePath("/manager/orders");
  revalidatePath("/cashier/orders");
  revalidatePath("/livreur/orders");

  console.log(
    `Shopify cron sync: ${result.synced} ok, ${result.failed} échec(s)`
  );

  return NextResponse.json({
    ok: true,
    synced: result.synced,
    failed: result.failed,
    at: new Date().toISOString(),
  });
}

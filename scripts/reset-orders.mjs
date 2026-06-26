import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🗑️  Suppression de toutes les commandes Shopify…\n");
  console.log("   (table products conservée)\n");

  const { data: orders, error: fetchError } = await supabase
    .from("shopify_orders")
    .select("id, sale_id");

  if (fetchError) throw fetchError;

  const { data: linkedSales, error: salesError } = await supabase
    .from("sales")
    .select("id")
    .not("shopify_order_id", "is", null);

  if (salesError) throw salesError;

  const saleIds = [
    ...new Set([
      ...(orders || []).map((o) => o.sale_id).filter(Boolean),
      ...(linkedSales || []).map((s) => s.id),
    ]),
  ];

  const { error: deleteOrdersError } = await supabase
    .from("shopify_orders")
    .delete()
    .gte("created_at", "1970-01-01T00:00:00Z");

  if (deleteOrdersError) throw deleteOrdersError;

  console.log(`✓  ${orders?.length ?? 0} commande(s) Shopify supprimée(s)`);

  if (saleIds.length > 0) {
    const { error: deleteItemsError } = await supabase
      .from("sale_items")
      .delete()
      .in("sale_id", saleIds);

    if (deleteItemsError) throw deleteItemsError;

    const { error: deleteSalesError } = await supabase
      .from("sales")
      .delete()
      .in("id", saleIds);

    if (deleteSalesError) throw deleteSalesError;

    console.log(`✓  ${saleIds.length} vente(s) caisse liée(s) supprimée(s)`);
  }

  console.log("\n✅ Commandes remises à zéro\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

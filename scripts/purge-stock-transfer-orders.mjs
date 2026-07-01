/**
 * Purge toutes les commandes / transferts de stock (hub + inter-magasins).
 * Conserve : ventes, commandes Shopify, clients, produits, stock actuel.
 *
 * Usage : node scripts/purge-stock-transfer-orders.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

async function clearTable(supabase, table) {
  const { error } = await supabase.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z");
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`✓  ${table}`);
}

async function purgeWithoutRpc(supabase) {
  await clearTable(supabase, "hub_stock_transfer_items");
  await clearTable(supabase, "store_stock_transfer_items");

  const { error: movementsError } = await supabase
    .from("stock_movements")
    .delete()
    .or("type.eq.transfer,hub_transfer_id.not.is.null,store_transfer_id.not.is.null");

  if (movementsError) throw movementsError;
  console.log("✓  stock_movements (transferts)");

  await clearTable(supabase, "hub_stock_transfers");
  await clearTable(supabase, "store_stock_transfers");
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🗑️  Purge de toutes les commandes / transferts de stock\n");

  const { data, error } = await supabase.rpc("purge_stock_transfer_orders");

  if (error) {
    if (!error.message?.includes("Could not find the function")) {
      throw error;
    }
    console.log("ℹ  RPC indisponible — purge table par table\n");
    await purgeWithoutRpc(supabase);
  } else {
    console.log("✓  purge_stock_transfer_orders (RPC)", data);
  }

  const [{ count: storeTransfers }, { count: hubTransfers }] = await Promise.all([
    supabase.from("store_stock_transfers").select("*", { count: "exact", head: true }),
    supabase.from("hub_stock_transfers").select("*", { count: "exact", head: true }),
  ]);

  console.log(`\n↔️  Transferts magasin restants : ${storeTransfers ?? "?"}`);
  console.log(`↔️  Transferts hub restants : ${hubTransfers ?? "?"}`);
  console.log("\n✅ Purge terminée\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

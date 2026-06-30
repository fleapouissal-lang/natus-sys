/**
 * Purge commandes + ventes uniquement.
 * Conserve : utilisateurs, clients, produits, catégories, magasins, stock actuel.
 *
 * Usage : node scripts/purge-sales-orders-data.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const DELETE_ORDER = [
  "sale_cheques",
  "sale_items",
  "loyalty_transactions",
];

async function clearTable(supabase, table) {
  const strategies = [
    () => supabase.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z"),
    () => supabase.from(table).delete().not("id", "is", null),
    () => supabase.from(table).delete().neq("sale_id", "00000000-0000-0000-0000-000000000000"),
  ];

  for (const run of strategies) {
    const { error } = await run();
    if (!error) {
      console.log(`✓  ${table}`);
      return;
    }
  }

  console.warn(`⚠  ${table} — déjà vide ou inaccessible`);
}

async function purgeWithoutRpc(supabase) {
  for (const table of DELETE_ORDER) {
    await clearTable(supabase, table);
  }

  const { error: customersError } = await supabase
    .from("customers")
    .update({ loyalty_points: 0, whatsapp_winback_sent_at: null })
    .gte("created_at", "1970-01-01T00:00:00Z");

  if (customersError) throw customersError;
  console.log("✓  customers — points fidélité remis à 0");

  const { error: promoError } = await supabase
    .from("winback_promo_codes")
    .update({ used_at: null, sale_id: null })
    .gte("created_at", "1970-01-01T00:00:00Z");

  if (promoError && !promoError.message.includes("does not exist")) throw promoError;
  else if (!promoError) console.log("✓  winback_promo_codes — réinitialisés");

  const { error: notesError } = await supabase
    .from("customer_notes")
    .delete()
    .not("shopify_order_id", "is", null);

  if (notesError && !notesError.message.includes("does not exist")) throw notesError;
  else if (!notesError) console.log("✓  customer_notes (commandes)");

  const { error: reviewsError } = await supabase
    .from("customer_whatsapp_reviews")
    .delete()
    .not("shopify_order_id", "is", null);

  if (reviewsError && !reviewsError.message.includes("does not exist")) throw reviewsError;
  else if (!reviewsError) console.log("✓  customer_whatsapp_reviews (commandes)");

  await clearTable(supabase, "shopify_orders");
  await clearTable(supabase, "sales");

  const { error: movementsError } = await supabase
    .from("stock_movements")
    .delete()
    .eq("type", "sale");

  if (movementsError) throw movementsError;
  console.log("✓  stock_movements (type=sale)");

  await clearTable(supabase, "store_day_closures");
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

  console.log(
    "🗑️  Purge ventes + commandes — conserve utilisateurs, clients, produits, catégories\n"
  );

  const { data, error } = await supabase.rpc("purge_sales_and_orders_data");

  if (error) {
    if (!error.message?.includes("Could not find the function")) {
      throw error;
    }
    console.log("ℹ  RPC indisponible — purge table par table\n");
    await purgeWithoutRpc(supabase);
  } else {
    console.log("✓  purge_sales_and_orders_data (RPC)", data);
  }

  const [
    { count: productCount },
    { count: customerCount },
    { count: profileCount },
    { count: categoryCount },
    { count: salesCount },
    { count: ordersCount },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("pos_category_cards").select("*", { count: "exact", head: true }),
    supabase.from("sales").select("*", { count: "exact", head: true }),
    supabase.from("shopify_orders").select("*", { count: "exact", head: true }),
  ]);

  console.log(`\n📦 Produits : ${productCount ?? "?"}`);
  console.log(`👥 Clients : ${customerCount ?? "?"}`);
  console.log(`👤 Utilisateurs : ${profileCount ?? "?"}`);
  console.log(`🏷️  Catégories POS : ${categoryCount ?? "?"}`);
  console.log(`🧾 Ventes restantes : ${salesCount ?? "?"}`);
  console.log(`📮 Commandes restantes : ${ordersCount ?? "?"}`);
  console.log("\n✅ Purge terminée\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

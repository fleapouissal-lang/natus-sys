/**
 * Remise à zéro des données opérationnelles — conserve uniquement `products`.
 * Réinitialise store_inventory à partir du catalogue produits.
 *
 * Usage : node scripts/reset-demo-data.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

async function clearTable(supabase, table) {
  const strategies = [
    () => supabase.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z"),
    () => supabase.from(table).delete().gte("updated_at", "1970-01-01T00:00:00Z"),
    () => supabase.from(table).delete().not("id", "is", null),
    () => supabase.from(table).delete().neq("phone", ""),
    () => supabase.from(table).delete().neq("store_id", "00000000-0000-0000-0000-000000000000"),
    () => supabase.from(table).delete().neq("sale_id", "00000000-0000-0000-0000-000000000000"),
  ];

  for (const run of strategies) {
    const { error } = await run();
    if (!error) {
      console.log(`✓  ${table} vidée`);
      return;
    }
  }

  console.warn(`⚠  ${table} : impossible de vider (peut-être déjà vide)`);
}

async function deleteAllAuthUsers(supabase) {
  let page = 1;
  let total = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    if (!data.users.length) break;

    for (const user of data.users) {
      const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
      if (delError) throw delError;
      total += 1;
    }

    if (data.users.length < 200) break;
  }

  console.log(`✓  auth.users — ${total} compte(s) supprimé(s)`);
}

async function rebuildStoreInventory(supabase) {
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (storesError) throw storesError;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, stock")
    .order("name");

  if (productsError) throw productsError;

  const rows = [];
  for (let i = 0; i < (stores || []).length; i++) {
    const store = stores[i];
    const factor = i === 0 ? 1 : 0.65;
    for (const product of products || []) {
      rows.push({
        store_id: store.id,
        product_id: product.id,
        stock: Math.max(Math.floor(Number(product.stock || 0) * factor), 8),
      });
    }
  }

  if (!rows.length) {
    console.log("⚠  Aucun magasin/produit — inventaire non recréé");
    return;
  }

  const { error } = await supabase.from("store_inventory").upsert(rows, {
    onConflict: "store_id,product_id",
  });

  if (error) throw error;
  console.log(`✓  store_inventory — ${rows.length} ligne(s) recréée(s)`);
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

  console.log("🗑️  Reset demo — conserve la table products (+ magasins)\n");

  const tables = [
    "news_announcement_images",
    "news_announcements",
    "pos_operator_sessions",
    "cashier_nfc_cards",
    "cashier_store_transfers",
    "cashier_week_offs",
    "cashier_shifts",
    "loyalty_transactions",
    "sale_items",
    "sales",
    "winback_promo_codes",
    "customer_whatsapp_reviews",
    "shopify_orders",
    "store_complaints",
    "short_links",
    "stock_movements",
    "hub_stock_transfer_items",
    "hub_stock_transfers",
    "whatsapp_bot_sessions",
    "customers",
    "hub_manager_assignments",
    "store_inventory",
  ];

  for (const table of tables) {
    await clearTable(supabase, table);
  }

  await deleteAllAuthUsers(supabase);
  await rebuildStoreInventory(supabase);

  console.log("\n✅ Reset terminé — products conservés\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

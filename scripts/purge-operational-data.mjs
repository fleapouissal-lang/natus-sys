/**
 * Purge opérationnelle — conserve products + utilisateurs.
 * Réinitialise le stock à 100 dans tous les magasins et dépôts actifs.
 *
 * Usage :
 *   node scripts/purge-operational-data.mjs
 *   node scripts/purge-operational-data.mjs --stock=100
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const DEFAULT_STOCK = 100;

const DELETE_ORDER = [
  "news_announcement_images",
  "news_announcements",
  "store_product_writeoff_photos",
  "store_product_writeoff_items",
  "store_product_writeoffs",
  "hub_stock_transfer_items",
  "store_stock_transfer_items",
  "sale_items",
  "sale_cheques",
  "loyalty_transactions",
  "customer_notes",
  "customer_whatsapp_reviews",
  "stock_modify_access_request_stores",
  "fabrication_inventory",
  "winback_promo_codes",
  "shopify_orders",
  "stock_movements",
  "hub_stock_transfers",
  "store_stock_transfers",
  "sales",
  "store_day_closures",
  "store_pos_notes",
  "store_complaints",
  "store_planning_cashiers",
  "cashier_store_transfers",
  "cashier_week_offs",
  "cashier_shifts",
  "cashier_nfc_cards",
  "pos_operator_sessions",
  "customers",
  "pro_client_registration_sessions",
  "pro_client_invites",
  "whatsapp_bot_sessions",
  "short_links",
  "hub_store_assignments",
  "hub_manager_assignments",
  "stock_modify_access_requests",
  "fabrication_products",
  "pos_category_cards",
  "loyalty_settings",
  "pos_closure_settings",
  "store_inventory",
];

function parseStockLevel(argv) {
  const arg = argv.find((value) => value.startsWith("--stock="));
  if (!arg) return DEFAULT_STOCK;
  const parsed = Number.parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_STOCK;
}

async function clearTable(supabase, table) {
  const strategies = [
    () => supabase.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z"),
    () => supabase.from(table).delete().gte("updated_at", "1970-01-01T00:00:00Z"),
    () => supabase.from(table).delete().not("id", "is", null),
    () => supabase.from(table).delete().neq("store_id", "00000000-0000-0000-0000-000000000000"),
    () => supabase.from(table).delete().neq("product_id", "00000000-0000-0000-0000-000000000000"),
    () => supabase.from(table).delete().neq("sale_id", "00000000-0000-0000-0000-000000000000"),
    () => supabase.from(table).delete().neq("phone", ""),
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

async function rebuildInventory(supabase, stockLevel) {
  const [{ data: stores, error: storesError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase.from("stores").select("id, name, is_hub").eq("is_active", true),
      supabase.from("products").select("id"),
    ]);

  if (storesError) throw storesError;
  if (productsError) throw productsError;

  const rows = [];
  for (const store of stores || []) {
    for (const product of products || []) {
      rows.push({ store_id: store.id, product_id: product.id, stock: stockLevel });
    }
  }

  if (!rows.length) {
    console.log("⚠  Aucun magasin/produit — inventaire non recréé");
    return { storeCount: 0, productCount: 0, rowCount: 0 };
  }

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("store_inventory").upsert(chunk, {
      onConflict: "store_id,product_id",
    });
    if (error) throw error;
  }

  const { error: productsUpdateError } = await supabase
    .from("products")
    .update({ stock: stockLevel })
    .gte("created_at", "1970-01-01T00:00:00Z");

  if (productsUpdateError) throw productsUpdateError;

  const hubCount = (stores || []).filter((store) => store.is_hub).length;
  const retailCount = (stores || []).length - hubCount;

  console.log(
    `✓  store_inventory — ${rows.length} ligne(s) à stock ${stockLevel} (${retailCount} magasin(s), ${hubCount} dépôt(s))`
  );
  console.log(`✓  products.stock — ${stockLevel}`);

  return {
    storeCount: stores?.length ?? 0,
    productCount: products?.length ?? 0,
    rowCount: rows.length,
  };
}

async function tryRpcPurge(supabase) {
  const { data, error } = await supabase.rpc("purge_operational_data");
  if (error) {
    if (error.message?.includes("Could not find the function")) {
      return false;
    }
    console.warn(`⚠  RPC purge_operational_data — ${error.message}`);
    console.log("ℹ  Reprise en purge table par table\n");
    return false;
  }
  console.log("✓  purge_operational_data (RPC)", data);
  return true;
}

async function main() {
  const stockLevel = parseStockLevel(process.argv.slice(2));
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
    `🗑️  Purge opérationnelle — conserve products + utilisateurs — stock ${stockLevel}\n`
  );

  const usedRpc = await tryRpcPurge(supabase);
  if (!usedRpc) {
    console.log("ℹ  RPC indisponible — purge table par table\n");
    for (const table of DELETE_ORDER) {
      await clearTable(supabase, table);
    }
    await rebuildInventory(supabase, stockLevel);
  } else if (stockLevel !== DEFAULT_STOCK) {
    await rebuildInventory(supabase, stockLevel);
  }

  const [{ count: productCount }, { count: profileCount }, { count: storeCount }] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("stores").select("*", { count: "exact", head: true }).eq("is_active", true),
    ]);

  console.log(`\n📦 Produits conservés : ${productCount ?? "?"}`);
  console.log(`👤 Utilisateurs conservés : ${profileCount ?? "?"}`);
  console.log(`🏪 Magasins / dépôts actifs : ${storeCount ?? "?"}`);
  console.log("\n✅ Base remise à zéro (hors catalogue et comptes)\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

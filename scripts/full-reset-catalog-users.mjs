/**
 * Purge complète : données opérationnelles, produits (+ photos storage),
 * magasins/dépôts, tous les utilisateurs.
 *
 * Usage : node scripts/full-reset-catalog-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const OPERATIONAL_TABLES = [
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

const CATALOG_BUCKETS = [
  "accueil",
  "visage",
  "corps",
  "cheveux",
  "hammam",
  "maison",
  "coffrets",
  "enfants",
  "homme",
  "soleil",
  "voyage",
  "pos-category-cards",
];

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

  // Repli : suppression ligne par ligne via les ids.
  const { data, error: selectError } = await supabase.from(table).select("id");
  if (selectError || !data?.length) {
    console.warn(`⚠  ${table} — déjà vide ou inaccessible`);
    return;
  }

  for (const row of data) {
    const { error: delError } = await supabase.from(table).delete().eq("id", row.id);
    if (delError) {
      console.warn(`⚠  ${table} — ${delError.message}`);
      return;
    }
  }

  console.log(`✓  ${table} (${data.length} ligne(s) via id)`);
}

async function listAllStoragePaths(supabase, bucket, prefix = "") {
  const paths = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    console.warn(`⚠  storage:${bucket}/${prefix} — ${error.message}`);
    return paths;
  }

  for (const item of data || []) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      paths.push(...(await listAllStoragePaths(supabase, bucket, itemPath)));
    } else {
      paths.push(itemPath);
    }
  }

  return paths;
}

async function purgeProductStorage(supabase) {
  let totalRemoved = 0;

  for (const bucket of CATALOG_BUCKETS) {
    const paths = await listAllStoragePaths(supabase, bucket);
    if (!paths.length) {
      console.log(`✓  storage/${bucket} — vide`);
      continue;
    }

    const chunkSize = 100;
    for (let i = 0; i < paths.length; i += chunkSize) {
      const chunk = paths.slice(i, i + chunkSize);
      const { error } = await supabase.storage.from(bucket).remove(chunk);
      if (error) {
        console.warn(`⚠  storage/${bucket} — ${error.message}`);
        break;
      }
      totalRemoved += chunk.length;
    }

    console.log(`✓  storage/${bucket} — ${paths.length} fichier(s) supprimé(s)`);
  }

  console.log(`✓  Photos produits — ${totalRemoved} fichier(s) au total`);
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
      if (delError) {
        console.warn(`⚠  ${user.email} : ${delError.message}`);
        continue;
      }
      total += 1;
    }

    if (data.users.length < 200) break;
    page += 1;
  }

  console.log(`✓  auth.users — ${total} compte(s) supprimé(s)`);
}

async function tryRpcPurge(supabase) {
  const { data, error } = await supabase.rpc("purge_operational_data");
  if (error) {
    if (error.message?.includes("Could not find the function")) return false;
    console.warn(`⚠  RPC purge_operational_data — ${error.message}`);
    return false;
  }
  console.log("✓  purge_operational_data (RPC)", data);
  return true;
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

  console.log("🗑️  Reset complet — produits, photos, magasins, dépôts, utilisateurs\n");

  const usedRpc = await tryRpcPurge(supabase);
  if (!usedRpc) {
    console.log("ℹ  Purge table par table (opérationnel)…\n");
    for (const table of OPERATIONAL_TABLES) {
      await clearTable(supabase, table);
    }
  } else {
    // La RPC recrée du stock — on le supprime avant le catalogue.
    await clearTable(supabase, "store_inventory");
  }

  console.log("\nℹ  Suppression des photos produits (storage)…\n");
  await purgeProductStorage(supabase);

  console.log("\nℹ  Suppression catalogue et points de vente…\n");
  for (const table of ["products", "stores"]) {
    await clearTable(supabase, table);
  }

  console.log("\nℹ  Suppression de tous les utilisateurs…\n");
  await deleteAllAuthUsers(supabase);

  const [{ count: productCount }, { count: storeCount }, { count: profileCount }] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("stores").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  console.log("\n📊 État final");
  console.log(`   Produits : ${productCount ?? "?"}`);
  console.log(`   Magasins/dépôts : ${storeCount ?? "?"}`);
  console.log(`   Profils : ${profileCount ?? "?"}`);
  console.log("\n✅ Reset terminé — appliquez la migration 183 puis recréez les comptes.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

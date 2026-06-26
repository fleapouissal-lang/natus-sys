/**
 * Supprime tous les comptes auth + données liées aux profils.
 * Désactive les magasins hors Marrakech / Casablanca.
 *
 * Usage : node scripts/reset-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const ALLOWED_CITIES = ["Marrakech", "Casablanca"];

async function clearTable(supabase, table) {
  const strategies = [
    () => supabase.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z"),
    () => supabase.from(table).delete().gte("updated_at", "1970-01-01T00:00:00Z"),
    () => supabase.from(table).delete().not("id", "is", null),
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

  console.warn(`⚠  ${table} : déjà vide ou non vidée`);
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
  }

  console.log(`✓  auth.users — ${total} compte(s) supprimé(s)`);
}

async function restrictStoresToAllowedCities(supabase) {
  const { data: stores, error } = await supabase.from("stores").select("id, name, city, is_active");
  if (error) throw error;

  const toDeactivate = (stores || []).filter((s) => !ALLOWED_CITIES.includes(s.city));
  if (!toDeactivate.length) {
    console.log("✓  Magasins déjà limités à Marrakech / Casablanca");
    return;
  }

  const { error: updateError } = await supabase
    .from("stores")
    .update({ is_active: false })
    .in(
      "id",
      toDeactivate.map((s) => s.id)
    );

  if (updateError) throw updateError;

  console.log(
    `✓  ${toDeactivate.length} magasin(s) désactivé(s) hors ${ALLOWED_CITIES.join(" / ")}`
  );
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

  console.log("🗑️  Reset utilisateurs — Marrakech & Casablanca uniquement\n");

  await restrictStoresToAllowedCities(supabase);

  const tables = [
    "news_announcement_images",
    "news_announcements",
    "pos_operator_sessions",
    "cashier_nfc_cards",
    "cashier_store_transfers",
    "cashier_week_offs",
    "cashier_shifts",
    "hub_stock_transfer_items",
    "hub_stock_transfers",
    "loyalty_transactions",
    "sale_items",
    "sales",
    "winback_promo_codes",
    "customer_whatsapp_reviews",
    "store_complaints",
    "short_links",
    "stock_movements",
    "whatsapp_bot_sessions",
    "customers",
    "hub_manager_assignments",
    "shopify_orders",
  ];

  for (const table of tables) {
    await clearTable(supabase, table);
  }

  await deleteAllAuthUsers(supabase);

  console.log("\n✅ Utilisateurs supprimés — lancez : npm run seed:users\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

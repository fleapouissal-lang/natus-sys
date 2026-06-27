/**
 * Supprime tous les rapports de clôture caisse et remet le jour métier au calendrier.
 * Usage: node scripts/reset-closure-reports.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

function calendarDateCasablanca() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
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

  const { data: before, error: beforeError } = await supabase
    .from("store_day_closures")
    .select("id, status, business_date, store_id");

  if (beforeError) throw beforeError;

  const { data: storesBefore, error: storesBeforeError } = await supabase
    .from("stores")
    .select("id, name, current_business_date");

  if (storesBeforeError) throw storesBeforeError;

  const byStatus = {};
  for (const row of before || []) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  }

  const { error: delError, count: deletedCount } = await supabase
    .from("store_day_closures")
    .delete({ count: "exact" })
    .not("id", "is", null);

  if (delError) throw delError;

  const calendar = calendarDateCasablanca();
  const { error: updError } = await supabase
    .from("stores")
    .update({ current_business_date: calendar })
    .not("id", "is", null);

  if (updError) throw updError;

  const { count: remaining, error: afterError } = await supabase
    .from("store_day_closures")
    .select("id", { count: "exact", head: true });

  if (afterError) throw afterError;

  const { data: storesAfter, error: storesAfterError } = await supabase
    .from("stores")
    .select("name, current_business_date")
    .order("name");

  if (storesAfterError) throw storesAfterError;

  console.log("\n▶ Rapports avant:", Object.keys(byStatus).length ? byStatus : "(aucun)");
  console.log(`   Total: ${before?.length ?? 0}`);
  console.log("▶ Magasins avant:", storesBefore);
  console.log(`\n✅ ${deletedCount ?? before?.length ?? 0} rapport(s) supprimé(s)`);
  console.log(`✅ Jour métier remis à ${calendar} (Africa/Casablanca)`);
  console.log("▶ Rapports restants:", remaining ?? 0);
  console.log("▶ Magasins après:", storesAfter);
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});

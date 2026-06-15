import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf-8");
  const env = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }

  return env;
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

  const { data: livreurs } = await supabase
    .from("profiles")
    .select("id, store_id, full_name, email")
    .eq("role", "livreur")
    .eq("is_active", true)
    .not("store_id", "is", null);

  const livreurByStore = new Map(
    (livreurs || []).map((row) => [row.store_id, row])
  );

  console.log(`🚚 Rattrapage affectation livreurs (${livreurs?.length ?? 0} livreur(s))\n`);

  const { data: orders, error } = await supabase
    .from("shopify_orders")
    .select("id, order_number, store_id, workflow_status")
    .in("workflow_status", ["ready", "shipping"])
    .is("assigned_livreur_id", null)
    .not("store_id", "is", null);

  if (error) throw error;

  let count = 0;
  for (const order of orders || []) {
    const livreur = livreurByStore.get(order.store_id);
    if (!livreur) {
      console.log(`⚠  ${order.order_number} — aucun livreur pour le magasin`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("shopify_orders")
      .update({
        assigned_livreur_id: livreur.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      console.error(`❌ ${order.order_number} : ${updateError.message}`);
      continue;
    }

    count++;
    console.log(`✓  ${order.order_number} → ${livreur.full_name || livreur.email}`);
  }

  console.log(`\n✅ ${count} commande(s) affectée(s) au livreur`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

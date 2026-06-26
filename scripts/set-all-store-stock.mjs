/**
 * Stock temporaire identique pour tous les produits / magasins.
 *
 * Usage : node scripts/set-all-store-stock.mjs [quantité]
 * Exemple : node scripts/set-all-store-stock.mjs 200
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const DEFAULT_QTY = 200;
const BATCH = 500;

async function main() {
  const qty = Number(process.argv[2] ?? DEFAULT_QTY);
  if (!Number.isFinite(qty) || qty < 0) {
    console.error("❌ Quantité invalide");
    process.exit(1);
  }

  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n▶ Stock magasin → ${qty} unités (temporaire)\n`);

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true);

  if (storesError) throw storesError;
  if (!stores?.length) {
    console.error("❌ Aucun magasin actif");
    process.exit(1);
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, product_kind")
    .in("product_kind", ["simple", "variant"]);

  if (productsError) throw productsError;

  const sellable = (products || []).filter(
    (p) => p.product_kind === "simple" || p.product_kind === "variant"
  );

  console.log(`   Magasins : ${stores.length}`);
  console.log(`   Produits : ${sellable.length}`);

  const rows = [];
  for (const store of stores) {
    for (const product of sellable) {
      rows.push({
        store_id: store.id,
        product_id: product.id,
        stock: qty,
      });
    }
  }

  console.log(`   Lignes inventaire : ${rows.length}\n`);

  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("store_inventory")
      .upsert(chunk, { onConflict: "store_id,product_id" });

    if (error) throw error;
    upserted += chunk.length;
    process.stdout.write(`\r   Mis à jour : ${upserted}/${rows.length}`);
  }

  console.log(`\n\n✅ Stock ${qty} appliqué sur tous les magasins actifs.\n`);
}

main().catch((err) => {
  console.error("\n❌", err.message || err);
  process.exit(1);
});

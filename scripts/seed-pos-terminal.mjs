/**
 * Vérifie le compte caisse partagé Guéliz (créé par seed-users).
 *
 * Usage : npm run seed:pos-terminal
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, city")
    .ilike("name", "%Guéliz%")
    .eq("is_active", true)
    .maybeSingle();

  if (!store) {
    console.error("Magasin Guéliz introuvable");
    process.exit(1);
  }

  const email = "caisse.gueliz@natus.ma";
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_store_pos, store_id")
    .eq("email", email)
    .maybeSingle();

  if (!profile?.is_store_pos) {
    console.error(`Compte caisse absent — lancez : npm run seed:users`);
    process.exit(1);
  }

  console.log(`✓ Compte caisse magasin : ${email}`);
  console.log(`  Magasin : ${store.name}`);
  console.log("\nConnexion caisse :");
  console.log(`  Email : ${email}`);
  console.log("  Mot de passe : Natus2026!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

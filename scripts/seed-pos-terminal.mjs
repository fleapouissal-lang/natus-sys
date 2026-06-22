/**
 * Crée le compte caisse partagé pour Natus Guéliz (exemple).
 *
 * Usage : npm run seed:pos-terminal
 * Prérequis : npm run db:migrate && npm run seed:users
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

async function findStore(supabase, namePart) {
  const { data } = await supabase
    .from("stores")
    .select("id, name, city")
    .ilike("name", `%${namePart}%`)
    .limit(1)
    .maybeSingle();
  return data;
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

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

  const store = await findStore(supabase, "Guéliz");
  if (!store) {
    console.error("Magasin Guéliz introuvable");
    process.exit(1);
  }

  const email = "caisse.gueliz@natus.ma";
  let user = await findUserByEmail(supabase, email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: "Natus2026!",
      email_confirm: true,
      user_metadata: {
        full_name: "Caisse Guéliz",
        role: "cashier",
      },
    });
    if (error) throw error;
    user = data.user;
    console.log(`✓ Compte auth créé : ${email}`);
  }

  if (user) {
    await supabase
      .from("profiles")
      .update({
        full_name: "Caisse Guéliz",
        role: "cashier",
        store_id: store.id,
        city: store.city,
        is_store_pos: true,
        is_active: true,
      })
      .eq("id", user.id);
    console.log(`✓ Compte caisse magasin lié à ${store.name}`);
  }

  console.log("\nConnexion caisse :");
  console.log(`  Email : ${email}`);
  console.log("  Mot de passe : Natus2026!");
  console.log("\nEnsuite, chaque caissier s'identifie sur la caisse (email/mdp ou badge NFC).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

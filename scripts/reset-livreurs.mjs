/**
 * Supprime tous les comptes livreur puis en crée 2 de test (1 Marrakech + 1 Casablanca).
 *
 * Usage : node scripts/reset-livreurs.mjs
 * Mot de passe : Natus2026!
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const PASSWORD = "Natus2026!";

const NEW_LIVREURS = [
  {
    email: "livreur.marrakech.1@natus.ma",
    full_name: "Livreur test Marrakech",
    city: "Marrakech",
  },
  {
    email: "livreur.casablanca.1@natus.ma",
    full_name: "Livreur test Casablanca",
    city: "Casablanca",
  },
];

async function findUserByEmail(supabase, email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function clearLivreurReferences(supabase, livreurIds) {
  if (livreurIds.length === 0) return;

  const ops = [
    supabase
      .from("shopify_orders")
      .update({ assigned_livreur_id: null })
      .in("assigned_livreur_id", livreurIds),
    supabase
      .from("hub_stock_transfers")
      .update({ assigned_livreur_id: null })
      .in("assigned_livreur_id", livreurIds),
    supabase
      .from("hub_stock_transfers")
      .update({ picked_up_by: null })
      .in("picked_up_by", livreurIds),
    supabase
      .from("hub_stock_transfers")
      .update({ delivered_by: null })
      .in("delivered_by", livreurIds),
    supabase
      .from("store_stock_transfers")
      .update({ assigned_livreur_id: null })
      .in("assigned_livreur_id", livreurIds),
    supabase
      .from("store_stock_transfers")
      .update({ picked_up_by: null })
      .in("picked_up_by", livreurIds),
    supabase.from("stock_movements").update({ created_by: null }).in("created_by", livreurIds),
  ];

  for (const op of ops) {
    const { error } = await op;
    if (error && error.code !== "42P01") {
      console.warn(`⚠  Références livreur : ${error.message}`);
    }
  }

  console.log(`✓  Références détachées (${livreurIds.length} livreur(s))`);
}

async function deleteLivreurs(supabase) {
  const { data: livreurs, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, city")
    .eq("role", "livreur");

  if (error) throw error;

  const rows = livreurs || [];
  if (rows.length === 0) {
    console.log("✓  Aucun livreur existant");
    return;
  }

  console.log(`→ Suppression de ${rows.length} livreur(s)…`);
  for (const row of rows) {
    console.log(`   • ${row.email || row.full_name || row.id}`);
  }

  await clearLivreurReferences(
    supabase,
    rows.map((r) => r.id)
  );

  for (const row of rows) {
    const { error: delError } = await supabase.auth.admin.deleteUser(row.id);
    if (delError) {
      console.warn(`⚠  ${row.email} : ${delError.message}`);
    }
  }

  console.log(`✓  ${rows.length} livreur(s) supprimé(s)`);
}

async function upsertLivreur(supabase, user) {
  const existing = await findUserByEmail(supabase, user.email);
  let userId = existing?.id;

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: "livreur",
        city: user.city,
      },
      app_metadata: { provider: "email", providers: ["email"] },
    });
    if (updateError) throw updateError;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: "livreur",
        city: user.city,
      },
      app_metadata: { provider: "email", providers: ["email"] },
    });
    if (error) throw error;
    userId = data.user?.id;
  }

  if (!userId) throw new Error(`Impossible de créer ${user.email}`);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: user.email,
      full_name: user.full_name,
      role: "livreur",
      is_active: true,
      city: user.city,
      store_id: null,
      is_store_pos: false,
    },
    { onConflict: "id" }
  );

  if (profileError) throw profileError;
  console.log(`✓  ${user.email} (${user.city})`);
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

  console.log("🚚 Reset livreurs — 2 comptes de test\n");

  await deleteLivreurs(supabase);

  console.log("\n→ Création des 2 livreurs de test…\n");
  for (const user of NEW_LIVREURS) {
    await upsertLivreur(supabase, user);
  }

  console.log(`\n✅ 2 livreurs créés — mot de passe : ${PASSWORD}`);
  console.log("\n  • livreur.marrakech.1@natus.ma (Marrakech)");
  console.log("  • livreur.casablanca.1@natus.ma (Casablanca)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

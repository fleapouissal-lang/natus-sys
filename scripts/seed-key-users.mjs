/**
 * Comptes direction + gérant Marrakech (Ismail).
 *
 * Usage : node scripts/seed-key-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const USERS = [
  {
    email: "directeur@natus.ma",
    password: "NatusDirecteur2026!",
    full_name: "Directeur Natus",
    role: "directeur",
    city: null,
  },
  {
    email: "financier@natus.ma",
    password: "NatusFinancier2026!",
    full_name: "Responsable Financier",
    role: "responsable_financier",
    city: null,
  },
  {
    email: "ismail@natus.ma",
    password: "NatusIsmail2026!",
    full_name: "Ismail",
    role: "manager",
    city: "Marrakech",
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

async function upsertUser(supabase, user) {
  const existing = await findUserByEmail(supabase, user.email);
  let userId = existing?.id;

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
        city: user.city || undefined,
      },
      app_metadata: { provider: "email", providers: ["email"] },
    });
    if (updateError) throw updateError;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
        city: user.city || undefined,
      },
      app_metadata: { provider: "email", providers: ["email"] },
    });
    if (error) throw error;
    userId = data.user?.id;
  }

  if (!userId) return;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: true,
      city: user.city,
      store_id: null,
      is_store_pos: false,
    },
    { onConflict: "id" }
  );

  if (profileError) throw profileError;

  console.log(`✓  ${user.email} (${user.role})`);
}

async function assignHubManagersForMarrakech(supabase) {
  const { data: hub } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "hub")
    .eq("city", "Marrakech")
    .maybeSingle();

  if (hub?.id) {
    await supabase.rpc("auto_assign_hub_managers", {
      p_hub_user_id: hub.id,
      p_city: "Marrakech",
    });
  }
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

  console.log("👤 Création des comptes clés\n");

  for (const user of USERS) {
    await upsertUser(supabase, user);
  }

  await assignHubManagersForMarrakech(supabase);

  console.log("\n✅ Comptes créés :\n");
  for (const user of USERS) {
    console.log(`  ${user.email}`);
    console.log(`    Rôle     : ${user.role}`);
    console.log(`    Mot de passe : ${user.password}`);
    if (user.city) console.log(`    Ville    : ${user.city}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

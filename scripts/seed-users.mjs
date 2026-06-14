import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const users = [
  {
    email: "directeur@natus.ma",
    password: "Natus2026!",
    full_name: "Directeur Natus",
    role: "directeur",
    city: null,
    store: null,
  },
  {
    email: "manager@natus.ma",
    password: "Natus2026!",
    full_name: "Gérant Marrakech",
    role: "manager",
    city: "Marrakech",
    store: null,
  },
  {
    email: "cashier@natus.ma",
    password: "Natus2026!",
    full_name: "Caissier Guéliz",
    role: "cashier",
    city: "Marrakech",
    store: "Natus Guéliz",
  },
  {
    email: "caissier2@natus.ma",
    password: "Natus2026!",
    full_name: "Caissier Médina",
    role: "cashier",
    city: "Marrakech",
    store: "Natus Médina",
  },
];

async function findUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((u) => u.email === email);
    if (found) return found;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🌱 Seed utilisateurs Natus POS\n");

  const { data: storeRows } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const storeByName = Object.fromEntries((storeRows || []).map((s) => [s.name, s.id]));

  for (const user of users) {
    const storeId = user.store ? storeByName[user.store] : null;
    const existing = await findUserByEmail(supabase, user.email);

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

      if (updateError) {
        console.error(`❌ ${user.email} (update) : ${updateError.message}`);
        continue;
      }

      await supabase
        .from("profiles")
        .update({
          full_name: user.full_name,
          role: user.role,
          is_active: true,
          city: user.city,
          store_id: storeId,
        })
        .eq("id", existing.id);

      console.log(`↻  Mis à jour : ${user.email} (${user.role})`);
      continue;
    }

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

    if (error) {
      console.error(`❌ ${user.email} : ${error.message}`);
      continue;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          full_name: user.full_name,
          role: user.role,
          is_active: true,
          city: user.city,
          store_id: storeId,
        })
        .eq("id", data.user.id);
    }

    console.log(`✓  Créé : ${user.email} (${user.role})`);
  }

  console.log("\n✅ Terminé — mot de passe : Natus2026!");
  console.log("\nComptes :");
  console.log("  • directeur@natus.ma  → Directeur (toutes villes)");
  console.log("  • manager@natus.ma    → Gérant Marrakech");
  console.log("  • cashier@natus.ma    → Caissier Guéliz");
  console.log("  • caissier2@natus.ma  → Caissier Médina");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

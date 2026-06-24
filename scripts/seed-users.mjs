/**
 * Seed utilisateurs — direction, gérants, 3 caissiers + caisse magasin par store, livreurs.
 *
 * Usage : node scripts/seed-users.mjs
 * Mot de passe commun : Natus2026!
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const PASSWORD = "Natus2026!";

const CASHIER_NAMES = [
  ["Oussal", "Alami"],
  ["Hajar", "Bennani"],
  ["Sara", "Tazi"],
];

function storeEmailSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function citySlug(city) {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function buildUsers(stores) {
  const users = [
    {
      email: "admin@natus.ma",
      password: PASSWORD,
      full_name: "Admin Dashboard",
      role: "admin",
      city: null,
      store: null,
      is_store_pos: false,
    },
    {
      email: "directeur@natus.ma",
      password: PASSWORD,
      full_name: "Directeur Natus",
      role: "directeur",
      city: null,
      store: null,
      is_store_pos: false,
    },
  ];

  const cities = [...new Set(stores.map((s) => s.city))].sort();
  for (const city of cities) {
    users.push({
      email: `manager.${citySlug(city)}@natus.ma`,
      password: PASSWORD,
      full_name: `Gérant ${city}`,
      role: "manager",
      city,
      store: null,
      is_store_pos: false,
    });

    users.push({
      email: `hub.${citySlug(city)}@natus.ma`,
      password: PASSWORD,
      full_name: `Hub stock ${city}`,
      role: "hub",
      city,
      store: null,
      is_store_pos: false,
    });
  }

  for (const store of stores) {
    const slug = storeEmailSlug(store.name);

    users.push({
      email: `caisse.${slug}@natus.ma`,
      password: PASSWORD,
      full_name: `Caisse ${store.name}`,
      role: "cashier",
      city: store.city,
      store: store.name,
      is_store_pos: true,
    });

    for (let i = 0; i < CASHIER_NAMES.length; i++) {
      const [first, last] = CASHIER_NAMES[i];
      users.push({
        email: `${first.toLowerCase()}.${slug}@natus.ma`,
        password: PASSWORD,
        full_name: `${first} ${last}`,
        role: "cashier",
        city: store.city,
        store: store.name,
        is_store_pos: false,
      });
    }

    users.push({
      email: `livreur.${slug}@natus.ma`,
      password: PASSWORD,
      full_name: `Livreur ${store.name}`,
      role: "livreur",
      city: store.city,
      store: store.name,
      is_store_pos: false,
    });
  }

  return users;
}

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

async function upsertUser(supabase, user, storeByName) {
  const storeId = user.store ? storeByName[user.store] : null;
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

  const profilePayload = {
    id: userId,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: true,
    city: user.city,
    store_id: storeId,
    is_store_pos: user.role === "cashier" ? Boolean(user.is_store_pos) : false,
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (profileError) throw profileError;

  const label = user.is_store_pos ? "caisse magasin" : user.role;
  console.log(`✓  ${user.email} (${label})`);
}

async function assignHubManagers(supabase, stores) {
  const cities = [...new Set(stores.map((s) => s.city))];
  for (const city of cities) {
    const { data: hub } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "hub")
      .eq("city", city)
      .maybeSingle();

    const { data: managers } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "manager")
      .eq("city", city);

    if (hub?.id && managers?.length) {
      await supabase.rpc("auto_assign_hub_managers", {
        p_hub_user_id: hub.id,
        p_city: city,
      });
    }
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

  console.log("🌱 Seed utilisateurs Natus\n");

  const { data: storeRows, error: storesError } = await supabase
    .from("stores")
    .select("id, name, city")
    .eq("is_active", true)
    .order("name");

  if (storesError) throw storesError;
  if (!storeRows?.length) {
    console.error("❌ Aucun magasin actif — lancez npm run db:migrate");
    process.exit(1);
  }

  const storeByName = Object.fromEntries(storeRows.map((s) => [s.name, s.id]));
  const users = buildUsers(storeRows);

  for (const user of users) {
    await upsertUser(supabase, user, storeByName);
  }

  await assignHubManagers(supabase, storeRows);

  console.log(`\n✅ ${users.length} comptes — mot de passe : ${PASSWORD}`);
  console.log("\nExemple Guéliz :");
  console.log("  • caisse.natus.gueliz@natus.ma → terminal caisse (login app)");
  console.log("  • oussal.natus.gueliz@natus.ma → caissier 1 (connexion caisse)");
  console.log("  • hajar.natus.gueliz@natus.ma  → caissier 2");
  console.log("  • sara.natus.gueliz@natus.ma   → caissier 3");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Seed utilisateurs — Marrakech & Casablanca uniquement.
 * Un compte caisse partagé par magasin (pas de comptes caissiers individuels).
 *
 * Usage : node scripts/seed-users.mjs
 * Mot de passe commun : Natus2026!
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const PASSWORD = "Natus2026!";
const ALLOWED_CITIES = ["Marrakech", "Casablanca"];

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

  for (const city of ALLOWED_CITIES) {
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

    users.push(
      {
        email: `livreur.${citySlug(city)}.1@natus.ma`,
        password: PASSWORD,
        full_name: `Livreur ${city} 1`,
        role: "livreur",
        city,
        store: null,
        is_store_pos: false,
      },
      {
        email: `livreur.${citySlug(city)}.2@natus.ma`,
        password: PASSWORD,
        full_name: `Livreur ${city} 2`,
        role: "livreur",
        city,
        store: null,
        is_store_pos: false,
      }
    );
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

async function assignHubManagers(supabase) {
  for (const city of ALLOWED_CITIES) {
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

async function seedPlanningCashiers(supabase, stores) {
  const demoNames = ["Fatima", "Youssef", "Sara"];

  for (const store of stores) {
    for (let i = 0; i < demoNames.length; i += 1) {
      const fullName = `${demoNames[i]} (${store.name.split(" ").pop()})`;
      const { data: existing } = await supabase
        .from("store_planning_cashiers")
        .select("id")
        .eq("store_id", store.id)
        .eq("full_name", fullName)
        .maybeSingle();

      if (existing?.id) continue;

      const { error } = await supabase.from("store_planning_cashiers").insert({
        store_id: store.id,
        full_name: fullName,
        sort_order: i,
      });

      if (error?.code === "42P01") {
        console.warn("⚠  Table store_planning_cashiers absente — lancez npm run db:apply:078");
        return;
      }
      if (error) throw error;
    }
  }

  console.log("✓  Caissiers planning (noms par magasin)");
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

  console.log("🌱 Seed utilisateurs — Marrakech & Casablanca\n");

  const { data: storeRows, error: storesError } = await supabase
    .from("stores")
    .select("id, name, city, is_hub")
    .eq("is_active", true)
    .eq("is_hub", false)
    .in("city", ALLOWED_CITIES)
    .order("city")
    .order("name");

  if (storesError) throw storesError;
  if (!storeRows?.length) {
    console.error("❌ Aucun magasin actif à Marrakech / Casablanca — lancez npm run db:migrate");
    process.exit(1);
  }

  const storeByName = Object.fromEntries(storeRows.map((s) => [s.name, s.id]));
  const users = buildUsers(storeRows);

  for (const user of users) {
    await upsertUser(supabase, user, storeByName);
  }

  await assignHubManagers(supabase);
  await seedPlanningCashiers(supabase, storeRows);

  console.log(`\n✅ ${users.length} comptes — mot de passe : ${PASSWORD}`);
  console.log("\nMarrakech :");
  console.log("  • manager.marrakech@natus.ma");
  console.log("  • hub.marrakech@natus.ma");
  console.log("  • caisse.natus.gueliz@natus.ma");
  console.log("  • caisse.natus.medina@natus.ma");
  console.log("\nCasablanca :");
  console.log("  • manager.casablanca@natus.ma");
  console.log("  • hub.casablanca@natus.ma");
  console.log("  • caisse.natus.casablanca.anfa@natus.ma");
  console.log("\nDirection : directeur@natus.ma | Admin : admin@natus.ma");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

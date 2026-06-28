/**
 * Seed des donnees de demo Natus (a lancer APRES le reset SQL qui cree les magasins).
 *
 * Cree : gerants de ville, gerants par magasin, comptes hub (depots),
 * comptes caisse par magasin, caissiers planning (noms), livreurs,
 * affectations depot -> magasins.
 *
 * Usage : node scripts/seed-demo.mjs
 * Mot de passe commun : Natus2026!
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const PASSWORD = "Natus2026!";

const STORES = [
  { name: "Ourika", city: "Marrakech", slug: "ourika" },
  { name: "Guéliz", city: "Marrakech", slug: "gueliz" },
  { name: "Médina", city: "Marrakech", slug: "medina" },
  { name: "Oulfa", city: "Casablanca", slug: "oulfa" },
  { name: "Maarif", city: "Casablanca", slug: "maarif" },
  { name: "Sidi Maârouf", city: "Casablanca", slug: "sidi.maarouf" },
];

// Gerant de ville
const CITY_MANAGERS = [
  { email: "manager.marrakech@natus.ma", full_name: "Hind Alaoui", city: "Marrakech" },
  { email: "manager.casablanca@natus.ma", full_name: "Karim Bennani", city: "Casablanca" },
];

// Gerant par magasin (limite au magasin)
const STORE_MANAGERS = {
  Ourika: "Rachid Benjelloun",
  Guéliz: "Salma Tazi",
  Médina: "Khalid Idrissi",
  Oulfa: "Amine Saidi",
  Maarif: "Leila Chraibi",
  "Sidi Maârouf": "Omar Fassi",
};

// Comptes hub (un par depot, relie par ville)
const HUBS = [
  { email: "hub.marrakech@natus.ma", full_name: "Dépôt Sidi Ghanem", city: "Marrakech" },
  { email: "hub.casablanca@natus.ma", full_name: "Dépôt Oulfa", city: "Casablanca" },
];

// Caissiers planning (noms differents par magasin)
const PLANNING_CASHIERS = {
  Ourika: ["Nadia", "Imane", "Soufiane"],
  Guéliz: ["Yassine", "Meryem", "Otmane"],
  Médina: ["Hajar", "Bilal", "Kawtar"],
  Oulfa: ["Sara", "Reda", "Najat"],
  Maarif: ["Walid", "Asma", "Hicham"],
  "Sidi Maârouf": ["Ghita", "Anas", "Loubna"],
};

// Livreurs (noms de famille differents, multi-villes)
const LIVREURS = [
  { email: "livreur.mohamed@natus.ma", full_name: "Mohamed El Amrani", city: "Marrakech" },
  { email: "livreur.youssef@natus.ma", full_name: "Youssef Berrada", city: "Casablanca" },
  { email: "livreur.hamza@natus.ma", full_name: "Hamza Ouali", city: "Marrakech" },
  { email: "livreur.ayoub@natus.ma", full_name: "Ayoub Naciri", city: "Casablanca" },
  { email: "livreur.zakaria@natus.ma", full_name: "Zakaria Sami", city: "Marrakech" },
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

  const meta = {
    full_name: user.full_name,
    role: user.role,
    city: user.city || undefined,
  };

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: meta,
      app_metadata: { provider: "email", providers: ["email"] },
    });
    if (error) throw error;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: meta,
      app_metadata: { provider: "email", providers: ["email"] },
    });
    if (error) throw error;
    userId = data.user?.id;
  }

  if (!userId) throw new Error(`Impossible de creer ${user.email}`);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: true,
      city: user.city,
      store_id: user.store_id ?? null,
      is_store_pos: user.role === "cashier" ? Boolean(user.is_store_pos) : false,
    },
    { onConflict: "id" }
  );
  if (profileError) throw profileError;

  console.log(`  ✓ ${user.email.padEnd(34)} ${user.full_name} [${user.role}]`);
  return userId;
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

  console.log("🌱 Seed demo Natus\n");

  // --- Lire les magasins crees par le reset SQL ---
  const { data: storeRows, error: storesError } = await supabase
    .from("stores")
    .select("id, name, city, is_hub, is_active");
  if (storesError) throw storesError;

  const storeByName = Object.fromEntries((storeRows || []).map((s) => [s.name, s]));
  for (const s of STORES) {
    if (!storeByName[s.name]) {
      console.error(`❌ Magasin manquant en base : ${s.name} — lancez d'abord le reset SQL`);
      process.exit(1);
    }
  }

  // --- Gerants de ville ---
  console.log("→ Gerants de ville");
  for (const m of CITY_MANAGERS) {
    await upsertUser(supabase, { ...m, role: "manager", store_id: null });
  }

  // --- Gerants par magasin (limite au magasin) ---
  console.log("→ Gerants par magasin");
  for (const s of STORES) {
    const store = storeByName[s.name];
    await upsertUser(supabase, {
      email: `gerant.${s.slug}@natus.ma`,
      full_name: STORE_MANAGERS[s.name],
      role: "manager",
      city: s.city,
      store_id: store.id,
    });
  }

  // --- Comptes hub (depots) ---
  console.log("→ Comptes depot (hub)");
  const hubIdByCity = {};
  for (const h of HUBS) {
    const id = await upsertUser(supabase, { ...h, role: "hub", store_id: null });
    hubIdByCity[h.city] = id;
  }

  // --- Comptes caisse (un par magasin) ---
  console.log("→ Comptes caisse");
  for (const s of STORES) {
    const store = storeByName[s.name];
    await upsertUser(supabase, {
      email: `caisse.${s.slug}@natus.ma`,
      full_name: `Caisse ${s.name}`,
      role: "cashier",
      city: s.city,
      store_id: store.id,
      is_store_pos: true,
    });
  }

  // --- Livreurs ---
  console.log("→ Livreurs");
  for (const l of LIVREURS) {
    await upsertUser(supabase, { ...l, role: "livreur", store_id: null });
  }

  // --- Caissiers planning (noms par magasin) ---
  console.log("→ Caissiers planning");
  for (const s of STORES) {
    const store = storeByName[s.name];
    const names = PLANNING_CASHIERS[s.name] || [];
    for (let i = 0; i < names.length; i += 1) {
      const { data: existing } = await supabase
        .from("store_planning_cashiers")
        .select("id")
        .eq("store_id", store.id)
        .eq("full_name", names[i])
        .maybeSingle();
      if (existing?.id) continue;
      const { error } = await supabase.from("store_planning_cashiers").insert({
        store_id: store.id,
        full_name: names[i],
        sort_order: i,
      });
      if (error) throw error;
    }
  }
  console.log("  ✓ noms de caissiers ajoutes au planning");

  // --- Affectations depot -> magasins + gerants ---
  console.log("→ Affectations depot");
  for (const s of STORES) {
    const hubId = hubIdByCity[s.city];
    if (!hubId) continue;
    const store = storeByName[s.name];
    const { error } = await supabase
      .from("hub_store_assignments")
      .upsert(
        { hub_user_id: hubId, store_id: store.id },
        { onConflict: "store_id", ignoreDuplicates: true }
      );
    if (error) throw error;
  }
  for (const [city, hubId] of Object.entries(hubIdByCity)) {
    const { error } = await supabase.rpc("auto_assign_hub_managers", {
      p_hub_user_id: hubId,
      p_city: city,
    });
    if (error) console.warn(`  ⚠ auto_assign_hub_managers (${city}) : ${error.message}`);
  }
  console.log("  ✓ depots relies a leurs magasins");

  console.log(`\n✅ Seed termine — mot de passe commun : ${PASSWORD}`);
  console.log("\nDirection : directeur@natus.ma   |   Admin : admin@natus.ma");
  console.log("Depots    : hub.marrakech@natus.ma (Sidi Ghanem), hub.casablanca@natus.ma (Oulfa)");
  console.log("Gerants ville : manager.marrakech@natus.ma (Hind), manager.casablanca@natus.ma (Karim)");
  console.log("Caisses   : caisse.<magasin>@natus.ma  (ourika, gueliz, medina, oulfa, maarif, sidi.maarouf)");
  console.log("Livreurs  : livreur.<prenom>@natus.ma  (mohamed, youssef, hamza, ayoub, zakaria)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

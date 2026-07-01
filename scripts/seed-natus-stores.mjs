/**
 * Crée les magasins Natus (retail) + compte caisse magasin par point de vente.
 *
 * Usage : node scripts/seed-natus-stores.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";
import {
  caisseEmailForStore,
  LEGACY_CAISSE_EMAILS,
  managerEmailForStore,
  STORE_CAISSE_EMAILS,
} from "./lib/store-caisse-emails.mjs";

const PASSWORD = "Natus2026!";
const MANAGER_PASSWORD = "Natus2026!";

const STORES = [
  {
    name: "Natus Rabat",
    city: "Rabat",
    address: "15, Av de France Agdal Rabat",
  },
  {
    name: "Natus Triangle d'or Casablanca",
    city: "Casablanca",
    address: "7 Angle rue bab mandab et bab irfane 20250 Casablanca Triangle d'or",
  },
  {
    name: "Natus Gueliz Marrakech",
    city: "Marrakech",
    address: "Angle rue Tarik Ibn Ziad et rue Syrie, Guéliz Marrakech",
  },
  {
    name: "Natus Socco Alto Tanger",
    city: "Tanger",
    address: "Centre Commercial Socco Alto Tanger",
  },
  {
    name: "Natus Medina Mall",
    city: "Marrakech",
    address: "91 Av.houman fetouaki, Marrakesh 40000",
  },
  {
    name: "Natus Sidi Ghanem",
    city: "Marrakech",
    address: "214, QI, Marrakech 40110",
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

async function upsertPosAccount(supabase, store) {
  const email = caisseEmailForStore(store.name);
  const legacyEmail = LEGACY_CAISSE_EMAILS[store.name];

  let userId;
  const existing = await findUserByEmail(supabase, email);
  const legacyUser = legacyEmail ? await findUserByEmail(supabase, legacyEmail) : null;

  if (legacyUser && legacyUser.id !== existing?.id) {
    const { error: renameError } = await supabase.auth.admin.updateUserById(legacyUser.id, {
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: `Caisse ${store.name}`,
        role: "cashier",
        city: store.city,
      },
    });
    if (renameError) throw renameError;
    userId = legacyUser.id;
  } else if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: `Caisse ${store.name}`,
        role: "cashier",
        city: store.city,
      },
    });
    if (error) throw error;
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: `Caisse ${store.name}`,
        role: "cashier",
        city: store.city,
      },
      app_metadata: { provider: "email", providers: ["email"] },
    });
    if (error) throw error;
    userId = data.user?.id;
  }

  if (!userId) return email;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: `Caisse ${store.name}`,
      role: "cashier",
      is_active: true,
      city: store.city,
      store_id: store.id,
      is_store_pos: true,
    },
    { onConflict: "id" }
  );

  if (profileError) throw profileError;
  return email;
}

async function upsertManagerAccount(supabase, store) {
  const email = managerEmailForStore(store.name);
  if (!email) {
    console.warn(`⚠  Pas d'email gérant pour ${store.name}`);
    return null;
  }

  const fullName = `Gérant ${store.name.replace(/^Natus\s+/i, "")}`;

  let userId;
  const existing = await findUserByEmail(supabase, email);

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: MANAGER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "manager",
        city: store.city,
      },
    });
    if (error) throw error;
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: MANAGER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "manager",
        city: store.city,
      },
      app_metadata: { provider: "email", providers: ["email"] },
    });
    if (error) throw error;
    userId = data.user?.id;
  }

  if (!userId) return email;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role: "manager",
      is_active: true,
      city: store.city,
      store_id: store.id,
      is_store_pos: false,
    },
    { onConflict: "id" }
  );

  if (profileError) throw profileError;
  return email;
}

async function upsertStore(supabase, input) {
  const { data: existing } = await supabase
    .from("stores")
    .select("id, name, city, address, is_active")
    .eq("name", input.name)
    .maybeSingle();

  if (existing?.id) {
    const { data: updated, error } = await supabase
      .from("stores")
      .update({
        city: input.city,
        address: input.address,
        is_active: true,
        is_hub: false,
      })
      .eq("id", existing.id)
      .select("id, name, city, address")
      .single();

    if (error) throw error;
    console.log(`↻  ${input.name} — mis à jour`);
    return updated;
  }

  const { data: created, error } = await supabase
    .from("stores")
    .insert({
      name: input.name,
      city: input.city,
      address: input.address,
      is_active: true,
      is_hub: false,
    })
    .select("id, name, city, address")
    .single();

  if (error) throw error;
  console.log(`✓  ${input.name} — créé`);
  return created;
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

  console.log("🏪 Création des magasins Natus\n");

  const createdStores = [];
  for (const store of STORES) {
    const row = await upsertStore(supabase, store);
    createdStores.push(row);
  }

  console.log("\n👤 Comptes caisse magasin\n");

  for (const store of createdStores) {
    const email = await upsertPosAccount(supabase, store);
    console.log(`✓  Caisse  ${store.name} → ${email}`);
  }

  console.log("\n👤 Comptes gérant (1 par magasin)\n");

  for (const store of createdStores) {
    const email = await upsertManagerAccount(supabase, store);
    if (email) console.log(`✓  Gérant  ${store.name} → ${email}`);
  }

  console.log(`\n✅ ${createdStores.length} magasin(s)`);
  console.log(`   Mot de passe caisse  : ${PASSWORD}`);
  console.log(`   Mot de passe gérant  : ${MANAGER_PASSWORD}`);
  console.log("\nRécapitulatif :");
  console.log("Magasin".padEnd(38) + "Caisse".padEnd(34) + "Gérant");
  console.log("-".repeat(100));
  for (const store of createdStores) {
    const caisse = caisseEmailForStore(store.name);
    const gerant = managerEmailForStore(store.name) || "—";
    console.log(store.name.padEnd(38) + caisse.padEnd(34) + gerant);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

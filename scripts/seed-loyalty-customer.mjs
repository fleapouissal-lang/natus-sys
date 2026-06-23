/**
 * Client fidélité de démo — carte FID-000002
 *
 * Usage : npm run seed:loyalty-customer
 * Prérequis : npm run db:migrate (magasins seedés)
 */
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const CUSTOMER_ID = "b2000000-0000-4000-8000-000000000002";
const CARD_NUMBER = "FID-000002";

const CUSTOMER = {
  id: CUSTOMER_ID,
  full_name: "Salma Berrada",
  phone: "+212612000002",
  email: "salma.berrada.demo@natus.ma",
  card_number: CARD_NUMBER,
  loyalty_points: 250,
  card_variant: "champagne",
};

async function findStore(supabase, namePart) {
  const { data } = await supabase
    .from("stores")
    .select("id, name, city")
    .ilike("name", `%${namePart}%`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🎴 Seed client fidélité —", CARD_NUMBER, "\n");

  const store = await findStore(supabase, "Guéliz");
  if (!store) {
    console.error("❌ Magasin Guéliz introuvable. Lancez d'abord npm run seed:users");
    process.exit(1);
  }

  const { data: byCard } = await supabase
    .from("customers")
    .select("id")
    .eq("card_number", CARD_NUMBER)
    .maybeSingle();

  const { data: byPhone } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", CUSTOMER.phone)
    .maybeSingle();

  const existingId = byCard?.id ?? byPhone?.id ?? null;

  if (existingId) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        full_name: CUSTOMER.full_name,
        phone: CUSTOMER.phone,
        email: CUSTOMER.email,
        card_number: CARD_NUMBER,
        loyalty_points: CUSTOMER.loyalty_points,
        card_variant: CUSTOMER.card_variant,
        store_id: store.id,
      })
      .eq("id", existingId)
      .select("id, full_name, phone, card_number, loyalty_points, store_id")
      .single();

    if (error) throw error;
    console.log("✅ Client mis à jour");
    printSummary(data, store);
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        id: CUSTOMER.id,
        full_name: CUSTOMER.full_name,
        phone: CUSTOMER.phone,
        email: CUSTOMER.email,
        card_number: CARD_NUMBER,
        loyalty_points: CUSTOMER.loyalty_points,
        card_variant: CUSTOMER.card_variant,
        store_id: store.id,
        qr_token: randomUUID(),
      })
      .select("id, full_name, phone, card_number, loyalty_points, store_id")
      .single();

    if (error) throw error;
    console.log("✅ Client créé");
    printSummary(data, store);
  }

  console.log("\n💡 Scan caisse :", CARD_NUMBER);
}

function printSummary(customer, store) {
  console.log("");
  console.log("   Nom      :", customer.full_name);
  console.log("   Téléphone:", customer.phone);
  console.log("   Carte    :", customer.card_number);
  console.log("   Points   :", customer.loyalty_points);
  console.log("   Magasin  :", store.name, `(${store.city})`);
  console.log("   ID       :", customer.id);
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});

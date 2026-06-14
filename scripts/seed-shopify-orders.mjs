import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

/** IDs Shopify fictifs — plage réservée au seed (9000000001+) */
const SEED_SHOPIFY_IDS = [9000000001, 9000000002, 9000000003];

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

function lineItem({ id, title, sku, quantity, price }) {
  return {
    id,
    title,
    sku,
    quantity,
    price: String(price),
    variant_id: id * 10,
  };
}

function buildSeedOrders(storeByName, productByBarcode) {
  const gueliz = storeByName["Natus Guéliz"];
  const medina = storeByName["Natus Médina"];

  if (!gueliz || !medina) {
    throw new Error("Magasins Natus Guéliz / Natus Médina introuvables — lancez les migrations d'abord.");
  }

  const creme = productByBarcode["340001000001"];
  const serum = productByBarcode["340001000002"];
  const rouge = productByBarcode["340001000003"];
  const mascara = productByBarcode["340001000004"];
  const eau = productByBarcode["340001000005"];

  const missing = [
    !creme && "340001000001",
    !serum && "340001000002",
    !rouge && "340001000003",
    !mascara && "340001000004",
    !eau && "340001000005",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(`Produits seed introuvables (barcode) : ${missing.join(", ")}`);
  }

  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

  const onlineItems = [
    lineItem({
      id: 10001,
      title: creme.name,
      sku: creme.barcode,
      quantity: 2,
      price: creme.price,
    }),
    lineItem({
      id: 10002,
      title: serum.name,
      sku: serum.barcode,
      quantity: 1,
      price: serum.price,
    }),
  ];
  const onlineTotal =
    Number(creme.price) * 2 + Number(serum.price);

  const codItems = [
    lineItem({
      id: 10003,
      title: rouge.name,
      sku: rouge.barcode,
      quantity: 1,
      price: rouge.price,
    }),
    lineItem({
      id: 10004,
      title: mascara.name,
      sku: mascara.barcode,
      quantity: 2,
      price: mascara.price,
    }),
  ];
  const codTotal =
    Number(rouge.price) + Number(mascara.price) * 2;

  const codMedinaItems = [
    lineItem({
      id: 10005,
      title: eau.name,
      sku: eau.barcode,
      quantity: 3,
      price: eau.price,
    }),
    lineItem({
      id: 10006,
      title: creme.name,
      sku: creme.barcode,
      quantity: 1,
      price: creme.price,
    }),
  ];
  const codMedinaTotal =
    Number(eau.price) * 3 + Number(creme.price);

  return [
    {
      shopify_order_id: SEED_SHOPIFY_IDS[0],
      order_number: "#WEB1001",
      store_id: gueliz,
      city: "Marrakech",
      customer_name: "Fatima El Amrani",
      customer_email: "fatima.elamrani@example.com",
      customer_phone: "+212612345678",
      shipping_address: "12 Rue de la Liberté, Guéliz, Marrakech",
      shipping_lat: 31.6345,
      shipping_lng: -8.0089,
      financial_status: "paid",
      fulfillment_status: null,
      order_status: "open",
      payment_type: "online",
      workflow_status: "paid",
      payment_gateway: "shopify_payments",
      total: onlineTotal,
      currency: "MAD",
      line_items: onlineItems,
      shopify_created_at: hoursAgo(5),
    },
    {
      shopify_order_id: SEED_SHOPIFY_IDS[1],
      order_number: "#WEB1002",
      store_id: gueliz,
      city: "Marrakech",
      customer_name: "Youssef Benali",
      customer_email: "youssef.benali@example.com",
      customer_phone: "+212698765432",
      shipping_address: "45 Avenue Hassan II, Guéliz, Marrakech",
      shipping_lat: 31.6298,
      shipping_lng: -7.9991,
      financial_status: "pending",
      fulfillment_status: null,
      order_status: "open",
      payment_type: "cod",
      workflow_status: "pending",
      payment_gateway: "Cash on Delivery (COD)",
      total: codTotal,
      currency: "MAD",
      line_items: codItems,
      shopify_created_at: hoursAgo(2),
    },
    {
      shopify_order_id: SEED_SHOPIFY_IDS[2],
      order_number: "#WEB1003",
      store_id: medina,
      city: "Marrakech",
      customer_name: "Amina Tazi",
      customer_email: "amina.tazi@example.com",
      customer_phone: "+212611223344",
      shipping_address: "8 Derb Dabachi, Médina, Marrakech",
      shipping_lat: 31.6257,
      shipping_lng: -7.9891,
      financial_status: "pending",
      fulfillment_status: null,
      order_status: "open",
      payment_type: "cod",
      workflow_status: "preparing",
      payment_gateway: "manual",
      total: codMedinaTotal,
      currency: "MAD",
      line_items: codMedinaItems,
      shopify_created_at: hoursAgo(1),
    },
  ];
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

  console.log("🛒 Seed commandes Shopify (en ligne + COD)\n");

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true)
    .in("name", ["Natus Guéliz", "Natus Médina"]);

  if (storesError) throw storesError;

  const storeByName = Object.fromEntries((stores || []).map((s) => [s.name, s.id]));

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("name, barcode, price")
    .in("barcode", [
      "340001000001",
      "340001000002",
      "340001000003",
      "340001000004",
      "340001000005",
    ]);

  if (productsError) throw productsError;

  const productByBarcode = Object.fromEntries(
    (products || []).map((p) => [p.barcode, p])
  );

  const orders = buildSeedOrders(storeByName, productByBarcode);

  const { error: deleteError } = await supabase
    .from("shopify_orders")
    .delete()
    .in("shopify_order_id", SEED_SHOPIFY_IDS);

  if (deleteError) throw deleteError;

  const { data: inserted, error: insertError } = await supabase
    .from("shopify_orders")
    .insert(orders)
    .select("order_number, payment_type, total, store_id");

  if (insertError) throw insertError;

  for (const order of inserted || []) {
    const type = order.payment_type === "cod" ? "COD" : "En ligne (payée)";
    console.log(`✓  ${order.order_number} — ${type} — ${Number(order.total).toFixed(2)} MAD`);
  }

  console.log("\n✅ 3 commandes seed créées :");
  console.log("  • #WEB1001 — payée en ligne (Guéliz) → bouton Caisse + ticket");
  console.log("  • #WEB1002 — COD en attente (Guéliz) → Caisse ou Encaisser COD");
  console.log("  • #WEB1003 — COD en préparation (Médina)");
  console.log("\nRelance : npm run seed:orders");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

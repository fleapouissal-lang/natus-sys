import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

/** IDs Shopify fictifs — plage réservée au seed (9000000001+) */
const SEED_ID_START = 9000000001;
const SEED_ORDER_COUNT = 40;

const PRODUCT_BARCODES = [
  "340001000001",
  "340001000002",
  "340001000003",
  "340001000004",
  "340001000005",
  "340001000006",
];

const CUSTOMERS = [
  { name: "Fatima El Amrani", email: "fatima.elamrani@example.com", phone: "+212612345678" },
  { name: "Youssef Benali", email: "youssef.benali@example.com", phone: "+212698765432" },
  { name: "Amina Tazi", email: "amina.tazi@example.com", phone: "+212611223344" },
  { name: "Karim Idrissi", email: "karim.idrissi@example.com", phone: "+212612998877" },
  { name: "Salma Berrada", email: "salma.berrada@example.com", phone: "+212661234567" },
  { name: "Hassan Alaoui", email: "hassan.alaoui@example.com", phone: "+212612445566" },
  { name: "Nadia Chakir", email: "nadia.chakir@example.com", phone: "+212677889900" },
  { name: "Omar Filali", email: "omar.filali@example.com", phone: "+212612778899" },
  { name: "Laila Mansouri", email: "laila.mansouri@example.com", phone: "+212698112233" },
  { name: "Rachid Zemmouri", email: "rachid.zemmouri@example.com", phone: "+212612556677" },
  { name: "Inès Bennani", email: "ines.bennani@example.com", phone: "+212661998877" },
  { name: "Mehdi Ouazzani", email: "mehdi.ouazzani@example.com", phone: "+212612334455" },
];

const GUELIZ_ADDRESSES = [
  { address: "12 Rue de la Liberté, Guéliz, Marrakech", lat: 31.6345, lng: -8.0089 },
  { address: "45 Avenue Hassan II, Guéliz, Marrakech", lat: 31.6298, lng: -7.9991 },
  { address: "8 Boulevard Mohammed V, Guéliz, Marrakech", lat: 31.6312, lng: -8.0034 },
  { address: "22 Rue Ibn Khaldoun, Guéliz, Marrakech", lat: 31.6361, lng: -8.0112 },
];

const MEDINA_ADDRESSES = [
  { address: "8 Derb Dabachi, Médina, Marrakech", lat: 31.6257, lng: -7.9891 },
  { address: "15 Souk Semmarine, Médina, Marrakech", lat: 31.6244, lng: -7.9876 },
  { address: "3 Derb Sidi Bouloukat, Médina, Marrakech", lat: 31.6268, lng: -7.9912 },
  { address: "27 Place des Ferblantiers, Médina, Marrakech", lat: 31.6239, lng: -7.9855 },
];

const WORKFLOW_FOR_POS = ["pending", "preparing", "ready", "shipping"];
const WORKFLOW_CLOSED = ["paid", "cancelled", "returned", "delivered"];

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

function pick(arr, index) {
  return arr[index % arr.length];
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(hour, 30, 0, 0);
  return date.toISOString();
}

function buildLineItems(index, products) {
  const count = (index % 4) + 1;
  const items = [];
  let lineId = 10000 + index * 10;

  for (let j = 0; j < count; j++) {
    const product = products[(index + j) % products.length];
    const quantity = (index + j) % 3 + 1;
    items.push(
      lineItem({
        id: lineId++,
        title: product.name,
        sku: product.barcode,
        quantity,
        price: product.price,
      })
    );
  }

  return items;
}

function computeTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
}

function buildSeedOrders(storeByName, products) {
  const gueliz = storeByName["Natus Guéliz"];
  const medina = storeByName["Natus Médina"];

  if (!gueliz || !medina) {
    throw new Error("Magasins Natus Guéliz / Natus Médina introuvables — lancez les migrations d'abord.");
  }

  if (products.length === 0) {
    throw new Error("Aucun produit seed trouvé — vérifiez les codes-barres 340001000001–340001000006");
  }

  const orders = [];

  for (let i = 0; i < SEED_ORDER_COUNT; i++) {
    const shopifyOrderId = SEED_ID_START + i;
    const orderNumber = `#WEB${1001 + i}`;
    const isGueliz = i % 2 === 0;
    const storeId = isGueliz ? gueliz : medina;
    const shipping = pick(isGueliz ? GUELIZ_ADDRESSES : MEDINA_ADDRESSES, i);
    const customer = pick(CUSTOMERS, i);
    const isCod = i % 5 !== 0;
    const lineItems = buildLineItems(i, products);
    const total = computeTotal(lineItems);

    let shopifyCreatedAt;
    if (i < 18) {
      shopifyCreatedAt = hoursAgo((i % 12) + 0.5);
    } else if (i < 28) {
      shopifyCreatedAt = daysAgo(1, 9 + (i % 8));
    } else if (i < 36) {
      shopifyCreatedAt = daysAgo(2 + (i % 5), 11 + (i % 6));
    } else {
      shopifyCreatedAt = daysAgo(7 + (i % 3), 14);
    }

    let workflowStatus;
    let financialStatus;
    if (i >= SEED_ORDER_COUNT - 4) {
      workflowStatus = pick(WORKFLOW_CLOSED, i);
      financialStatus =
        workflowStatus === "paid" || workflowStatus === "delivered" ? "paid" : "pending";
    } else {
      workflowStatus = pick(WORKFLOW_FOR_POS, i);
      financialStatus = isCod ? "pending" : "paid";
    }

    const isClosed = workflowStatus === "paid" || workflowStatus === "cancelled" || workflowStatus === "returned";

    orders.push({
      shopify_order_id: shopifyOrderId,
      order_number: orderNumber,
      store_id: storeId,
      city: "Marrakech",
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      shipping_address: shipping.address,
      shipping_lat: shipping.lat,
      shipping_lng: shipping.lng,
      financial_status: financialStatus,
      fulfillment_status: null,
      order_status: isClosed ? "closed" : "open",
      payment_type: isCod ? "cod" : "online",
      workflow_status: workflowStatus,
      payment_gateway: isCod ? "Cash on Delivery (COD)" : "shopify_payments",
      sale_id: null,
      total,
      currency: "MAD",
      line_items: lineItems,
      shopify_created_at: shopifyCreatedAt,
    });
  }

  return orders;
}

function seedIdRange() {
  return Array.from({ length: SEED_ORDER_COUNT }, (_, i) => SEED_ID_START + i);
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

  console.log(`🛒 Seed commandes Shopify — ${SEED_ORDER_COUNT} commandes\n`);

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
    .in("barcode", PRODUCT_BARCODES)
    .order("barcode");

  if (productsError) throw productsError;

  const orders = buildSeedOrders(storeByName, products || []);
  const seedIds = seedIdRange();

  const { error: deleteError } = await supabase
    .from("shopify_orders")
    .delete()
    .in("shopify_order_id", seedIds);

  if (deleteError) throw deleteError;

  const { data: inserted, error: insertError } = await supabase
    .from("shopify_orders")
    .insert(orders)
    .select("order_number, payment_type, workflow_status, total, shopify_created_at, store_id");

  if (insertError) throw insertError;

  const todayKey = new Date().toISOString().slice(0, 10);
  let todayCount = 0;
  let codCount = 0;
  let posReadyCount = 0;

  for (const order of inserted || []) {
    const day = (order.shopify_created_at || "").slice(0, 10);
    if (day === todayKey) todayCount++;
    if (order.payment_type === "cod") codCount++;
    if (!["paid", "cancelled", "returned"].includes(order.workflow_status)) posReadyCount++;

    const type = order.payment_type === "cod" ? "COD" : "En ligne";
    console.log(
      `✓  ${order.order_number} — ${type} — ${order.workflow_status} — ${Number(order.total).toFixed(2)} MAD`
    );
  }

  console.log(`\n✅ ${inserted?.length ?? 0} commandes seed créées`);
  console.log(`  • ${todayCount} commande(s) datées d'aujourd'hui (filtre caisse par défaut)`);
  console.log(`  • ${codCount} COD / ${(inserted?.length ?? 0) - codCount} en ligne`);
  console.log(`  • ${posReadyCount} préparables en caisse (sans sale_id, non annulées)`);
  console.log("\nRelance : npm run seed:orders");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

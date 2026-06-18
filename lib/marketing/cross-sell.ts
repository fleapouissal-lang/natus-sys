import { createAdminClient } from "@/lib/supabase/admin";

/** Catégories complémentaires après achat */
const CROSS_SELL_TARGETS: Record<string, string[]> = {
  Parfum: ["Soin visage", "Corps", "Accessoires"],
  Maquillage: ["Nettoyage", "Soin visage"],
  "Soin visage": ["Nettoyage", "Corps"],
  Corps: ["Parfum", "Soin visage"],
  Cheveux: ["Corps", "Soin visage"],
  Nettoyage: ["Soin visage", "Maquillage"],
  Accessoires: ["Parfum", "Maquillage"],
};

export type CrossSellProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
};

function normalizeCategory(category: string): string {
  return category.trim();
}

export function complementaryCategories(purchased: string[]): string[] {
  const targets = new Set<string>();
  for (const cat of purchased) {
    const key = normalizeCategory(cat);
    for (const t of CROSS_SELL_TARGETS[key] || ["Soin visage", "Corps"]) {
      if (!purchased.some((p) => normalizeCategory(p) === t)) {
        targets.add(t);
      }
    }
  }
  if (targets.size === 0) {
    return ["Soin visage", "Corps"];
  }
  return [...targets];
}

export async function findCrossSellProduct(
  storeId: string,
  purchasedCategories: string[],
  excludeProductIds: string[] = []
): Promise<CrossSellProduct | null> {
  const admin = createAdminClient();
  const targetCategories = complementaryCategories(purchasedCategories);

  for (const category of targetCategories) {
    const { data: inventory } = await admin
      .from("store_inventory")
      .select(
        `
        product_id,
        stock,
        products ( id, name, price, category, image_url )
      `
      )
      .eq("store_id", storeId)
      .gt("stock", 0)
      .limit(50);

    const match = (inventory || []).find((row) => {
      const product = row.products as CrossSellProduct | null;
      if (!product || excludeProductIds.includes(product.id)) return false;
      return normalizeCategory(product.category) === category;
    });

    if (match?.products) {
      const p = match.products as CrossSellProduct;
      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        category: p.category,
        image_url: p.image_url,
      };
    }

    const { data: fallback } = await admin
      .from("products")
      .select("id, name, price, category, image_url")
      .eq("category", category)
      .limit(20);

    const product = (fallback || []).find((p) => !excludeProductIds.includes(p.id));
    if (product) {
      return {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        category: product.category,
        image_url: product.image_url,
      };
    }
  }

  return null;
}

export async function getSaleProductCategories(
  saleId: string
): Promise<{ storeId: string; categories: string[]; productIds: string[] } | null> {
  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("sales")
    .select(
      `
      id,
      store_id,
      sale_items ( product_id, products ( id, category ) )
    `
    )
    .eq("id", saleId)
    .maybeSingle();

  if (!sale?.store_id) return null;

  const items = (sale.sale_items || []) as {
    product_id: string;
    products: { id: string; category: string } | null;
  }[];

  return {
    storeId: sale.store_id,
    categories: items.map((i) => i.products?.category).filter(Boolean) as string[],
    productIds: items.map((i) => i.product_id),
  };
}

export async function getOrderProductCategories(
  orderId: string
): Promise<{ storeId: string; categories: string[] } | null> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("shopify_orders")
    .select("id, store_id, line_items")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.store_id) return null;

  const lineItems = (order.line_items || []) as { title: string; sku?: string }[];
  const categories: string[] = [];

  for (const line of lineItems) {
    if (line.sku) {
      const { data: product } = await admin
        .from("products")
        .select("category")
        .eq("barcode", line.sku)
        .maybeSingle();
      if (product?.category) categories.push(product.category);
      continue;
    }
    const { data: product } = await admin
      .from("products")
      .select("category")
      .ilike("name", line.title)
      .limit(1)
      .maybeSingle();
    if (product?.category) categories.push(product.category);
  }

  if (categories.length === 0) {
    categories.push("Parfum");
  }

  return { storeId: order.store_id, categories };
}

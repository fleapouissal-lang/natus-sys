import {
  CATEGORY_CARD_IMAGES,
  getCategoryBucketSlug,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/lib/constants/products";
import { getProductCategories, isSellableProduct, productHasCategory } from "@/lib/products/product-utils";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import {
  POS_MIN_CATEGORY_PRODUCTS,
  type PosCategoryCardConfig,
  type PosCategoryCardRow,
} from "@/lib/pos/pos-category-cards/types";

function rowToConfig(row: PosCategoryCardRow): PosCategoryCardConfig {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    minProductCount: row.min_product_count,
  };
}

function fallbackConfigs(): PosCategoryCardConfig[] {
  return PRODUCT_CATEGORIES.map((name, index) => ({
    id: name,
    name,
    slug: getCategoryBucketSlug(name),
    imageUrl: CATEGORY_CARD_IMAGES[name as ProductCategory] ?? null,
    sortOrder: index + 1,
    minProductCount: POS_MIN_CATEGORY_PRODUCTS,
  }));
}

export async function listPosCategoryCards(): Promise<PosCategoryCardConfig[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_category_cards")
    .select("id, name, slug, image_url, sort_order, min_product_count")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data?.length) {
    if (error) {
      console.error("[pos] list category cards:", error.message);
    }
    return fallbackConfigs();
  }

  return (data as PosCategoryCardRow[]).map(rowToConfig);
}

export async function listAssignableProductCategories(): Promise<string[]> {
  const configs = await listPosCategoryCards();
  const names = new Set<string>([...PRODUCT_CATEGORIES]);
  for (const config of configs) {
    names.add(config.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "fr"));
}

export function countProductsByCategory(products: Product[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const product of products) {
    if (!isSellableProduct(product)) continue;
    for (const category of getProductCategories(product)) {
      counts[category] = (counts[category] ?? 0) + 1;
    }
  }

  return counts;
}

export async function getGlobalProductCountsByCategory(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("category, categories, product_kind");

  if (error || !data) {
    console.error("[pos] global category counts:", error?.message);
    return {};
  }

  return countProductsByCategory(data as Product[]);
}

export async function listProductsInCategory(categoryName: string): Promise<
  Pick<Product, "id" | "name" | "product_kind">[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, categories, product_kind");

  if (error || !data) {
    console.error("[pos] list products in category:", error?.message);
    return [];
  }

  return (data as Product[]).filter((product) => productHasCategory(product, categoryName));
}

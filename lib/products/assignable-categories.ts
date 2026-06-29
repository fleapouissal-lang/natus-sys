import {
  PRODUCT_CATEGORIES,
  UNCATEGORIZED_PRODUCT_CATEGORY,
  getCategoryBucketSlug,
} from "@/lib/constants/products";
import { getProductCategories } from "@/lib/products/product-utils";
import { POS_MIN_CATEGORY_PRODUCTS } from "@/lib/pos/pos-category-cards/types";
import type { Product } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export { UNCATEGORIZED_PRODUCT_CATEGORY };

export function normalizeCategoryName(raw: string): string | null {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (trimmed.length < 2 || trimmed.length > 48) return null;
  return trimmed
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function collectCategoryNamesFromProducts(
  products: Pick<Product, "category" | "categories">[]
): string[] {
  const names = new Set<string>();
  for (const product of products) {
    for (const category of getProductCategories(product as Product)) {
      if (category && category !== UNCATEGORIZED_PRODUCT_CATEGORY) {
        names.add(category);
      }
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, "fr"));
}

export async function fetchProductCategoryNames(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase.from("products").select("category, categories");
  if (error || !data) {
    console.error("[categories] fetch from products:", error?.message);
    return [];
  }
  return collectCategoryNamesFromProducts(data as Product[]);
}

export async function ensureUncategorizedCategoryCard(
  supabase: SupabaseClient
): Promise<void> {
  const name = UNCATEGORIZED_PRODUCT_CATEGORY;
  const { data: existing } = await supabase
    .from("pos_category_cards")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) return;

  const { data: maxSortRow } = await supabase
    .from("pos_category_cards")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxSortRow?.sort_order ?? PRODUCT_CATEGORIES.length) + 1;

  await supabase.from("pos_category_cards").insert({
    name,
    slug: getCategoryBucketSlug(name),
    image_url: null,
    sort_order: sortOrder,
    min_product_count: POS_MIN_CATEGORY_PRODUCTS,
  });
}

/** Crée la carte POS si absente. Retourne le nom normalisé ou null. */
export async function ensurePosCategoryCard(
  supabase: SupabaseClient,
  rawName: string
): Promise<string | null> {
  const name = normalizeCategoryName(rawName);
  if (!name || name === UNCATEGORIZED_PRODUCT_CATEGORY) return null;

  const { data: existing } = await supabase
    .from("pos_category_cards")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) return name;

  const { data: maxSortRow } = await supabase
    .from("pos_category_cards")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxSortRow?.sort_order ?? PRODUCT_CATEGORIES.length) + 1;

  const { error } = await supabase.from("pos_category_cards").insert({
    name,
    slug: getCategoryBucketSlug(name),
    image_url: null,
    sort_order: sortOrder,
    min_product_count: POS_MIN_CATEGORY_PRODUCTS,
  });

  if (error) {
    console.error("[categories] ensure card:", error.message);
    return null;
  }

  return name;
}

/** Crée les cartes POS manquantes à partir des catégories utilisées par les produits. */
export async function syncPosCategoryCardsFromProducts(
  supabase: SupabaseClient
): Promise<number> {
  await ensureUncategorizedCategoryCard(supabase);
  const names = await fetchProductCategoryNames(supabase);
  let created = 0;

  for (const name of names) {
    const { data: existing } = await supabase
      .from("pos_category_cards")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) continue;

    const ensured = await ensurePosCategoryCard(supabase, name);
    if (ensured) created++;
  }

  return created;
}

export async function getAssignableCategoryNames(
  supabase: SupabaseClient
): Promise<Set<string>> {
  await syncPosCategoryCardsFromProducts(supabase);

  const names = new Set<string>([UNCATEGORIZED_PRODUCT_CATEGORY]);

  for (const name of await fetchProductCategoryNames(supabase)) {
    names.add(name);
  }

  const { data: cards, error } = await supabase.from("pos_category_cards").select("name");
  if (error) {
    console.error("[categories] assignable list:", error.message);
  } else {
    for (const row of cards ?? []) {
      if (row.name) names.add(row.name);
    }
  }

  for (const legacy of PRODUCT_CATEGORIES) {
    names.add(legacy);
  }

  return names;
}

export async function listAssignableCategoryNames(
  supabase: SupabaseClient
): Promise<string[]> {
  const names = await getAssignableCategoryNames(supabase);
  names.delete(UNCATEGORIZED_PRODUCT_CATEGORY);

  const sorted = [...names].sort((a, b) => a.localeCompare(b, "fr"));
  if (sorted.length === 0) {
    return [...PRODUCT_CATEGORIES];
  }
  return sorted;
}

export async function parseAssignableCategoriesFromForm(
  supabase: SupabaseClient,
  formData: FormData
): Promise<string[] | null> {
  const raw = formData
    .getAll("categories")
    .map((value) => (value as string).trim())
    .filter(Boolean);

  const unique = [...new Set(raw)];
  if (unique.length === 0) return null;

  const normalized: string[] = [];

  for (const category of unique) {
    const ensured = await ensurePosCategoryCard(supabase, category);
    if (!ensured) return null;
    normalized.push(ensured);
  }

  return normalized;
}

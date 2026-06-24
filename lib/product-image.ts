import {
  CATEGORY_DEFAULT_IMAGES,
  getProductImagePublicUrl,
  type ProductCategory,
} from "@/lib/constants/products";
import { getProductCategories } from "@/lib/products/product-utils";
import type { Product } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  "Soin visage": "E8D5C4",
  Maquillage: "D4849A",
  Nettoyage: "B8D4E3",
  Parfum: "C9A962",
  Corps: "C5E1A5",
  Cheveux: "D4C5E8",
  Accessoires: "E6E6E6",
};

export type ProductImageSource = Pick<
  Product,
  "image_url" | "category" | "categories" | "name"
>;

export type ProductImageOptions = {
  parent?: ProductImageSource | null;
  /** Ignore product.image_url (ex. après erreur de chargement). */
  skipDirect?: boolean;
};

function normalizeProductImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (base) return `${base}${trimmed}`;
  }
  return trimmed;
}

/** Sert les images Supabase via localhost (évite blocages navigateur / CORS). */
function proxySupabaseStorageUrl(url: string): string {
  const normalized = normalizeProductImageUrl(url);
  const marker = "/storage/v1/object/public/";
  const index = normalized.indexOf(marker);
  if (index === -1) return normalized;

  const path = normalized.slice(index + marker.length).replace(/^\/+/, "");
  if (!path) return normalized;

  return `/api/product-image/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function finalizeProductImageUrl(url: string): string {
  if (url.includes("supabase.co/storage/v1/object/public/")) {
    return proxySupabaseStorageUrl(url);
  }
  return url;
}

function resolvePrimaryCategory(product: ProductImageSource): string | null {
  const categories = getProductCategories(product as Product);
  return categories[0] ?? product.category ?? null;
}

function resolveSupabaseDefaultImage(category: string | null): string | null {
  if (!category) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) return null;
  if (!(category in CATEGORY_DEFAULT_IMAGES)) return null;

  return getProductImagePublicUrl(
    supabaseUrl,
    category,
    CATEGORY_DEFAULT_IMAGES[category as ProductCategory]
  );
}

function resolvePlaceholder(product: ProductImageSource, category: string | null): string {
  const color = CATEGORY_COLORS[category || ""] || "E6E6E6";
  const label = encodeURIComponent(product.name.slice(0, 20));
  return `https://placehold.co/400x400/${color}/96703A?text=${label}&font=roboto`;
}

export function resolveParentImageSource(
  product: Pick<
    Product,
    "parent_name" | "parent_image_url" | "parent_categories" | "parent_category"
  >
): ProductImageSource | null {
  if (!product.parent_image_url && !product.parent_categories?.length && !product.parent_category) {
    return null;
  }

  return {
    name: product.parent_name ?? "",
    image_url: product.parent_image_url ?? null,
    category: product.parent_categories?.[0] ?? product.parent_category ?? null,
    categories: product.parent_categories,
  };
}

export function getProductImageUrl(
  product: ProductImageSource,
  options?: ProductImageOptions
): string {
  if (!options?.skipDirect) {
    const directUrl = product.image_url?.trim();
    if (directUrl) return finalizeProductImageUrl(directUrl);
  }

  const parentUrl = options?.parent?.image_url?.trim();
  if (parentUrl) return finalizeProductImageUrl(parentUrl);

  const category = resolvePrimaryCategory(product);
  const supabaseDefault = resolveSupabaseDefaultImage(category);
  if (supabaseDefault) return finalizeProductImageUrl(supabaseDefault);

  if (options?.parent) {
    const parentCategory = resolvePrimaryCategory(options.parent);
    const parentDefault = resolveSupabaseDefaultImage(parentCategory);
    if (parentDefault) return finalizeProductImageUrl(parentDefault);
  }

  return resolvePlaceholder(product, category);
}

/** Prochaine URL de secours après un échec de chargement. */
export function getProductImageFallbackUrl(
  product: ProductImageSource,
  options?: ProductImageOptions & { failedUrl?: string }
): string | null {
  const failed = options?.failedUrl?.trim();
  const direct = product.image_url?.trim();

  if (failed && direct && normalizeProductImageUrl(direct) === failed) {
    const next = getProductImageUrl(product, { ...options, skipDirect: true });
    return next !== failed ? next : null;
  }

  const parentUrl = options?.parent?.image_url?.trim();
  if (failed && parentUrl && normalizeProductImageUrl(parentUrl) === failed) {
    const next = getProductImageUrl(product, { ...options, skipDirect: true, parent: null });
    return next !== failed ? next : null;
  }

  const category = resolvePrimaryCategory(product);
  const supabaseDefault = resolveSupabaseDefaultImage(category);
  if (failed && supabaseDefault && supabaseDefault === failed) {
    return resolvePlaceholder(product, category);
  }

  if (failed && failed !== resolvePlaceholder(product, category)) {
    return resolvePlaceholder(product, category);
  }

  return null;
}

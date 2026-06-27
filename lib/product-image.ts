import type { Product } from "@/lib/types";
import { getProductCategories } from "@/lib/products/product-utils";

export const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

export type ProductImageSource = Pick<
  Product,
  "image_url" | "category" | "categories" | "name"
>;

export type ProductImageOptions = {
  parent?: ProductImageSource | null;
  /** Ignore product.image_url (ex. après erreur de chargement). */
  skipDirect?: boolean;
};

export function isProductPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  const trimmed = url.trim();
  return trimmed === PRODUCT_PLACEHOLDER || trimmed.endsWith("/product-placeholder.svg");
}

/** URL d’image réelle (pas vide, pas le placeholder catalogue). */
export function isRealProductImageUrl(url: string | null | undefined): boolean {
  return Boolean(url?.trim()) && !isProductPlaceholderUrl(url);
}

function normalizeProductImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/images/") || trimmed.startsWith("/logo")) return trimmed;
  if (trimmed.startsWith("/api/")) return trimmed;
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
  const normalized = normalizeProductImageUrl(url);
  if (normalized.includes("supabase.co/storage/v1/object/public/")) {
    return proxySupabaseStorageUrl(normalized);
  }
  return normalized;
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

/** Retourne une URL d’image ou null → afficher le placeholder visuel (logo sur fond gris). */
export function getProductImageUrl(
  product: ProductImageSource,
  options?: ProductImageOptions
): string | null {
  if (!options?.skipDirect) {
    const directUrl = product.image_url?.trim();
    if (isRealProductImageUrl(directUrl)) {
      return finalizeProductImageUrl(directUrl!);
    }
  }

  const parentUrl = options?.parent?.image_url?.trim();
  if (isRealProductImageUrl(parentUrl)) {
    return finalizeProductImageUrl(parentUrl!);
  }

  return null;
}

/** Prochaine URL de secours après un échec de chargement, ou null → placeholder visuel. */
export function getProductImageFallbackUrl(
  product: ProductImageSource,
  options?: ProductImageOptions & { failedUrl?: string }
): string | null {
  const failed = options?.failedUrl?.trim();
  if (!failed) return null;

  const next = getProductImageUrl(product, { ...options, skipDirect: true });
  if (next && next !== failed) return next;

  return null;
}

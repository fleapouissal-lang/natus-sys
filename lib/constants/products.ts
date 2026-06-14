export const PRODUCT_BRAND = "Natus";

export const PRODUCT_CATEGORIES = [
  "Soin visage",
  "Maquillage",
  "Nettoyage",
  "Parfum",
  "Corps",
  "Cheveux",
  "Accessoires",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Slug du bucket Supabase Storage (un bucket par catégorie) */
export function getCategoryBucketSlug(category: string): string {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export const CATEGORY_BUCKET_SLUGS = PRODUCT_CATEGORIES.map(getCategoryBucketSlug);

/** Image par défaut dans le bucket de chaque catégorie */
export const CATEGORY_DEFAULT_IMAGES: Record<ProductCategory, string> = {
  "Soin visage": "mille-vertus.png",
  Maquillage: "mille-vertus.png",
  Nettoyage: "mille-vertus.png",
  Parfum: "huile-precieuse.png",
  Corps: "huile-precieuse.png",
  Cheveux: "huile-precieuse.png",
  Accessoires: "mille-vertus.png",
};

export function getProductImagePublicUrl(
  supabaseUrl: string,
  category: string,
  fileName: string
): string {
  const bucket = getCategoryBucketSlug(category);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
}

export const PRODUCT_BRAND = "Natus";

/** Catégorie de repli lorsqu'une catégorie POS est supprimée. */
export const UNCATEGORIZED_PRODUCT_CATEGORY = "Produits sans catégorie";

/** Catégories catalogue (alignées sur la colonne « Catégorie » du fichier Excel POS). */
export const PRODUCT_CATEGORIES = [
  "Accueil",
  "Visage",
  "Corps",
  "Cheveux",
  "Hammam",
  "Maison",
  "Coffrets",
  "Enfants",
  "Homme",
  "Soleil",
  "Voyage",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Codes bruts Excel → libellé affiché */
export const EXCEL_CATEGORY_MAP: Record<string, ProductCategory> = {
  ACCUEL: "Accueil",
  ACCUEIL: "Accueil",
  BODY: "Corps",
  COFFRETS: "Coffrets",
  FACE: "Visage",
  HAIR: "Cheveux",
  HAMMAM: "Hammam",
  HOME: "Maison",
  KIDS: "Enfants",
  MEN: "Homme",
  SUN: "Soleil",
  TRAVEL: "Voyage",
};

export function mapExcelCategory(raw: string | null | undefined): ProductCategory {
  const key = String(raw ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toUpperCase();
  if (key && key in EXCEL_CATEGORY_MAP) {
    return EXCEL_CATEGORY_MAP[key as keyof typeof EXCEL_CATEGORY_MAP];
  }
  return "Corps";
}

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
  Accueil: "mille-vertus.png",
  Visage: "visage.png",
  Corps: "corps.png",
  Cheveux: "huile-precieuse.png",
  Hammam: "mille-vertus.png",
  Maison: "huile-precieuse.png",
  Coffrets: "mille-vertus.png",
  Enfants: "huile-precieuse.png",
  Homme: "huile-precieuse.png",
  Soleil: "huile-precieuse.png",
  Voyage: "mille-vertus.png",
};

/** Images fixes des cartes catégories POS (prioritaires sur la couverture produit). */
export const CATEGORY_CARD_IMAGES: Partial<Record<ProductCategory, string>> = {
  Visage: "/images/categories/visage.png",
  Corps: "/images/categories/corps.png",
  Cheveux: "/images/categories/cheveux.png",
  Hammam: "/images/categories/hammam.png",
  Homme: "/images/categories/homme.png",
  Enfants: "/images/categories/enfants.png",
  Voyage: "/images/categories/voyage.png",
  Soleil: "/images/categories/soleil.png",
  Coffrets: "/images/categories/coffrets.png",
};

export function getProductImagePublicUrl(
  supabaseUrl: string,
  category: string,
  fileName: string
): string {
  const bucket = getCategoryBucketSlug(category);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
}

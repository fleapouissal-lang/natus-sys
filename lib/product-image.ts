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

export function getProductImageUrl(product: Pick<Product, "image_url" | "category" | "name">): string {
  if (product.image_url) return product.image_url;

  const color = CATEGORY_COLORS[product.category || ""] || "E6E6E6";
  const label = encodeURIComponent(product.name.slice(0, 20));
  return `https://placehold.co/400x400/${color}/96703A?text=${label}&font=roboto`;
}

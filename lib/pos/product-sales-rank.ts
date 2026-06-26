import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import {
  getProductCategories,
  productDisplayName,
  productHasCategory,
} from "@/lib/products/product-utils";
import { resolveParentImageSource } from "@/lib/product-image";
import type { Product } from "@/lib/types";

export type ProductSalesQtyMap = Record<string, number>;

export function productSoldQty(
  productId: string,
  salesQty: ProductSalesQtyMap
): number {
  return salesQty[productId] ?? 0;
}

export function sortProductsByBestSellers(
  products: Product[],
  salesQty: ProductSalesQtyMap
): Product[] {
  return [...products].sort((a, b) => {
    const diff = productSoldQty(b.id, salesQty) - productSoldQty(a.id, salesQty);
    if (diff !== 0) return diff;
    return productDisplayName(
      a,
      a.parent_name ? ({ name: a.parent_name } as Product) : null
    ).localeCompare(
      productDisplayName(
        b,
        b.parent_name ? ({ name: b.parent_name } as Product) : null
      )
    );
  });
}

export type PosCategoryCard = {
  name: string;
  totalSold: number;
  productCount: number;
  coverProduct: Product | null;
};

function productHasImage(product: Product): boolean {
  if (product.image_url) return true;
  const parent = resolveParentImageSource(product);
  return Boolean(parent?.image_url);
}

export function buildPosCategoryCards(
  products: Product[],
  salesQty: ProductSalesQtyMap
): PosCategoryCard[] {
  const byCategory = new Map<string, Product[]>();

  for (const product of products) {
    for (const category of getProductCategories(product)) {
      const list = byCategory.get(category) ?? [];
      list.push(product);
      byCategory.set(category, list);
    }
  }

  const cards: PosCategoryCard[] = [];

  for (const name of PRODUCT_CATEGORIES) {
    const categoryProducts = byCategory.get(name);
    if (!categoryProducts?.length) continue;

    const sorted = sortProductsByBestSellers(categoryProducts, salesQty);
    const totalSold = sorted.reduce(
      (sum, product) => sum + productSoldQty(product.id, salesQty),
      0
    );
    const coverProduct =
      sorted.find((product) => productHasImage(product)) ?? sorted[0] ?? null;

    cards.push({
      name,
      totalSold,
      productCount: sorted.length,
      coverProduct,
    });
  }

  return cards.sort((a, b) => {
    if (b.totalSold !== a.totalSold) return b.totalSold - a.totalSold;
    return a.name.localeCompare(b.name, "fr");
  });
}

export function filterProductsForCategory(
  products: Product[],
  category: string,
  salesQty: ProductSalesQtyMap
): Product[] {
  return sortProductsByBestSellers(
    products.filter((product) => productHasCategory(product, category)),
    salesQty
  );
}

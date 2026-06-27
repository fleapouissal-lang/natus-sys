import { CATEGORY_CARD_IMAGES, type ProductCategory } from "@/lib/constants/products";
import {
  POS_MIN_CATEGORY_PRODUCTS,
  type PosCategoryCardConfig,
} from "@/lib/pos/pos-category-cards/types";
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
  coverImageUrl: string | null;
};

function productHasImage(product: Product): boolean {
  if (product.image_url) return true;
  const parent = resolveParentImageSource(product);
  return Boolean(parent?.image_url);
}

export function buildPosCategoryCards(
  products: Product[],
  salesQty: ProductSalesQtyMap,
  categoryConfigs: PosCategoryCardConfig[] = []
): PosCategoryCard[] {
  const byCategory = new Map<string, Product[]>();

  for (const product of products) {
    for (const category of getProductCategories(product)) {
      const list = byCategory.get(category) ?? [];
      list.push(product);
      byCategory.set(category, list);
    }
  }

  const configByName = new Map(categoryConfigs.map((config) => [config.name, config]));
  const orderedConfigs =
    categoryConfigs.length > 0
      ? [...categoryConfigs].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fr")
        )
      : [];

  const categoryNames =
    orderedConfigs.length > 0
      ? orderedConfigs.map((config) => config.name)
      : [...byCategory.keys()].sort((a, b) => a.localeCompare(b, "fr"));

  const cards: PosCategoryCard[] = [];

  for (const name of categoryNames) {
    const categoryProducts = byCategory.get(name);
    if (!categoryProducts?.length) continue;

    const config = configByName.get(name);
    const minCount = config?.minProductCount ?? POS_MIN_CATEGORY_PRODUCTS;
    if (categoryProducts.length < minCount) continue;

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
      coverImageUrl:
        config?.imageUrl ?? CATEGORY_CARD_IMAGES[name as ProductCategory] ?? null,
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

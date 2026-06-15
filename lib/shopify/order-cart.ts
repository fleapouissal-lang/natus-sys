import type { CartItem, Product, ShopifyLineItemRow } from "@/lib/types";

export type ProductLineLookup = Pick<
  Product,
  "id" | "name" | "barcode" | "image_url" | "category" | "price"
>;

export function resolveProductForLineItem(
  item: ShopifyLineItemRow,
  products: ProductLineLookup[]
): ProductLineLookup | null {
  const sku = item.sku?.trim();
  if (sku) {
    const byBarcode = products.find((p) => p.barcode === sku);
    if (byBarcode) return byBarcode;
  }
  const title = item.title.toLowerCase();
  return products.find((p) => p.name.toLowerCase() === title) ?? null;
}

export function mapShopifyLineItemsToCart(
  lineItems: ShopifyLineItemRow[],
  products: Product[]
): { cart: CartItem[]; missing: string[] } {
  const cart: CartItem[] = [];
  const missing: string[] = [];

  for (const item of lineItems) {
    const sku = item.sku?.trim();
    let product: Product | undefined;

    if (sku) {
      product = products.find((p) => p.barcode === sku);
    }

    if (!product) {
      const title = item.title.toLowerCase();
      product = products.find((p) => p.name.toLowerCase() === title);
    }

    if (!product) {
      missing.push(item.title);
      continue;
    }

    const qty = Math.max(1, item.quantity);
    const existing = cart.find((c) => c.product.id === product!.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ product, quantity: qty });
    }
  }

  return { cart, missing };
}

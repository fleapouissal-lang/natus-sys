import type { CartItem, Product, ShopifyLineItemRow } from "@/lib/types";
import { productDisplayName } from "@/lib/products/product-utils";

export type ProductLineLookup = Pick<
  Product,
  | "id"
  | "name"
  | "barcode"
  | "image_url"
  | "category"
  | "price"
  | "product_kind"
  | "parent_id"
  | "parent_name"
>;

function itemPriceFromProduct(product: ProductLineLookup): number {
  return Number(product.price) || 0;
}

function lineUnitPrice(item: ShopifyLineItemRow, product: ProductLineLookup): number {
  const fromLine = Number.parseFloat(item.price);
  if (Number.isFinite(fromLine) && fromLine > 0) return fromLine;
  return itemPriceFromProduct(product);
}

function enrichVariantProduct(
  product: ProductLineLookup,
  products: ProductLineLookup[],
  unitPrice: number
): Product {
  const parent =
    product.parent_id != null
      ? products.find((p) => p.id === product.parent_id)
      : null;

  return {
    ...(product as Product),
    price: unitPrice,
    parent_name: parent?.name ?? product.parent_name ?? null,
  };
}

export function resolveProductForLineItem(
  item: ShopifyLineItemRow,
  products: ProductLineLookup[]
): ProductLineLookup | null {
  const sku = item.sku?.trim();
  if (sku) {
    const byBarcode = products.find((p) => p.barcode === sku);
    if (byBarcode && byBarcode.product_kind !== "parent") {
      return byBarcode;
    }
  }

  const title = item.title.toLowerCase();

  const byCompositeTitle = products.find((p) => {
    if (p.product_kind !== "variant" || !p.parent_id) return false;
    const parent = products.find((row) => row.id === p.parent_id);
    if (!parent) return false;
    return productDisplayName(p, parent as Product).toLowerCase() === title;
  });
  if (byCompositeTitle) return byCompositeTitle;

  const byExactName = products.find(
    (p) => p.product_kind !== "parent" && p.name.toLowerCase() === title
  );
  if (byExactName) return byExactName;

  return null;
}

/** Commande / panier / vente — toujours variante ou produit simple (jamais parent). */
export function mapShopifyLineItemsToCart(
  lineItems: ShopifyLineItemRow[],
  products: ProductLineLookup[]
): { cart: CartItem[]; missing: string[] } {
  const cart: CartItem[] = [];
  const missing: string[] = [];

  for (const item of lineItems) {
    const product = resolveProductForLineItem(item, products);
    if (!product) {
      missing.push(item.title);
      continue;
    }

    const qty = Math.max(1, item.quantity);
    const unitPrice = lineUnitPrice(item, product);
    const existing = cart.find((c) => c.product.id === product.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({
        product: enrichVariantProduct(product, products, unitPrice),
        quantity: qty,
      });
    }
  }

  return { cart, missing };
}

/** Alias — même logique variante pour stock et vente. */
export function mapShopifyLineItemsToFulfill(
  lineItems: ShopifyLineItemRow[],
  products: ProductLineLookup[]
): { cart: CartItem[]; missing: string[] } {
  return mapShopifyLineItemsToCart(lineItems, products);
}

export function orderLineDisplayName(
  product: ProductLineLookup,
  products: ProductLineLookup[]
): string {
  if (product.product_kind === "variant" && product.parent_id) {
    const parent = products.find((p) => p.id === product.parent_id);
    if (parent) return productDisplayName(product, parent as Product);
  }
  return product.name;
}

import type { Product, ShopifyLineItemRow } from "@/lib/types";
import { mapShopifyLineItemsToCart } from "@/lib/shopify/order-cart";

export function orderLineItemsToRestockPayload(
  lineItems: ShopifyLineItemRow[],
  products: Product[]
): { items: { product_id: string; quantity: number }[]; missing: string[] } {
  const { cart, missing } = mapShopifyLineItemsToCart(lineItems, products);
  return {
    items: cart.map((row) => ({
      product_id: row.product.id,
      quantity: row.quantity,
    })),
    missing,
  };
}

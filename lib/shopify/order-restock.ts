import type { ProductLineLookup } from "@/lib/shopify/order-cart";
import type { ShopifyLineItemRow } from "@/lib/types";
import { mapShopifyLineItemsToFulfill } from "@/lib/shopify/order-cart";

export function orderLineItemsToRestockPayload(
  lineItems: ShopifyLineItemRow[],
  products: ProductLineLookup[]
): { items: { product_id: string; quantity: number }[]; missing: string[] } {
  const { cart, missing } = mapShopifyLineItemsToFulfill(lineItems, products);
  return {
    items: cart.map((row) => ({
      product_id: row.product.id,
      quantity: row.quantity,
    })),
    missing,
  };
}

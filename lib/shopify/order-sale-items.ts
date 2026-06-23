import {
  mapShopifyLineItemsToFulfill,
  type ProductLineLookup,
} from "@/lib/shopify/order-cart";
import type { ShopifyOrder } from "@/lib/types";

export function shopifyOrderToSaleItems(
  order: Pick<ShopifyOrder, "line_items">,
  products: ProductLineLookup[]
): { items: { product_id: string; quantity: number }[] } | { error: string } {
  const { cart, missing } = mapShopifyLineItemsToFulfill(order.line_items, products);

  if (cart.length === 0) {
    return {
      error:
        missing.length > 0
          ? `Produits non trouvés : ${missing.join(", ")}`
          : "Aucun produit dans la commande",
    };
  }

  return {
    items: cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    })),
  };
}

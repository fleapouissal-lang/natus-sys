export function transferItemsToQuantities(
  items: { product_id: string; quantity: number }[]
): Record<string, string> {
  return Object.fromEntries(items.map((item) => [item.product_id, String(item.quantity)]));
}

import type { Product, ProductKind } from "@/lib/types";

export function getProductCategories(product: Product): string[] {
  if (product.categories?.length) return product.categories;
  if (product.category) return [product.category];
  return [];
}

export function productHasCategory(product: Product, category: string): boolean {
  return getProductCategories(product).includes(category);
}

export function isSellableProduct(product: Product): boolean {
  return product.product_kind !== "parent";
}

export function productKindLabel(kind: ProductKind): string {
  switch (kind) {
    case "parent":
      return "Parent";
    case "variant":
      return "Variante";
    default:
      return "Produit";
  }
}

export function productDisplayName(
  product: Product,
  parent?: Product | null
): string {
  if (product.product_kind === "variant" && parent) {
    return `${parent.name} — ${product.name}`;
  }
  return product.name;
}

export function buildParentBarcode(): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `PARENT-${suffix}`;
}

export function groupProductsForList(products: Product[]): Product[] {
  const parents = products.filter((p) => p.product_kind === "parent");
  const variants = products.filter((p) => p.product_kind === "variant");
  const simples = products.filter(
    (p) => p.product_kind === "simple" || !p.product_kind
  );

  const variantsByParent = new Map<string, Product[]>();
  for (const variant of variants) {
    if (!variant.parent_id) continue;
    const list = variantsByParent.get(variant.parent_id) ?? [];
    list.push(variant);
    variantsByParent.set(variant.parent_id, list);
  }

  const parentIds = new Set(parents.map((p) => p.id));
  const topLevel = [...parents, ...simples].sort((a, b) =>
    a.name.localeCompare(b.name, "fr")
  );

  const result: Product[] = [];
  for (const product of topLevel) {
    result.push(product);
    if (product.product_kind === "parent") {
      const children = (variantsByParent.get(product.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "fr")
      );
      result.push(...children);
    }
  }

  for (const variant of variants) {
    if (variant.parent_id && !parentIds.has(variant.parent_id)) {
      result.push(variant);
    }
  }

  return result;
}

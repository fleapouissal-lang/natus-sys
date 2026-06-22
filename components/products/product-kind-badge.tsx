import { Badge } from "@/components/ui/badge";
import { productKindLabel } from "@/lib/products/product-utils";
import type { Product, ProductKind } from "@/lib/types";

export function ProductKindBadge({
  kind,
  className,
}: {
  kind: ProductKind;
  className?: string;
}) {
  const variant =
    kind === "parent" ? "default" : kind === "variant" ? "warning" : "success";

  return (
    <Badge variant={variant} className={className}>
      {productKindLabel(kind)}
    </Badge>
  );
}

export function ProductKindBadgeForProduct({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  return (
    <ProductKindBadge kind={product.product_kind ?? "simple"} className={className} />
  );
}

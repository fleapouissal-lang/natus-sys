import { ProductImage } from "@/components/pos/product-image";
import { Badge } from "@/components/ui/badge";
import { ProductKindBadgeForProduct } from "@/components/products/product-kind-badge";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_BRAND } from "@/lib/constants/products";
import {
  getProductCategories,
  productDisplayName,
} from "@/lib/products/product-utils";
import type { Product } from "@/lib/types";

export function ProductInfoCard({
  product,
  compact = false,
  parent,
}: {
  product: Product;
  compact?: boolean;
  parent?: Product | null;
}) {
  const categories = getProductCategories(product);
  const displayName = productDisplayName(product, parent);

  return (
    <div className={`flex gap-4 ${compact ? "items-center" : "flex-col sm:flex-row sm:items-center"}`}>
      <ProductImage product={product} size={compact ? "sm" : "md"} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-semibold text-foreground ${compact ? "text-base" : "text-lg"}`}>
            {displayName}
          </p>
          <ProductKindBadgeForProduct product={product} />
        </div>
        <p className="text-sm text-muted">{PRODUCT_BRAND}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {categories.map((category) => (
            <Badge key={category}>{category}</Badge>
          ))}
          {product.product_kind !== "parent" && (
            <Badge variant={product.stock < 10 ? "warning" : "success"}>
              Stock : {product.stock}
            </Badge>
          )}
        </div>
        {product.barcode && (
          <p className="mt-2 font-mono text-xs text-muted">{product.barcode}</p>
        )}
        {product.description && !compact && (
          <p className="mt-2 text-sm text-muted line-clamp-2">{product.description}</p>
        )}
        {product.product_kind !== "parent" && (
          <p className={`font-bold text-primary ${compact ? "mt-1 text-lg" : "mt-3 text-2xl"}`}>
            {formatCurrency(product.price)}
          </p>
        )}
      </div>
    </div>
  );
}

import { ProductImage } from "@/components/pos/product-image";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_BRAND } from "@/lib/constants/products";
import type { Product } from "@/lib/types";

export function ProductInfoCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  return (
    <div className={`flex gap-4 ${compact ? "items-center" : "flex-col sm:flex-row sm:items-center"}`}>
      <ProductImage product={product} size={compact ? "sm" : "md"} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-foreground ${compact ? "text-base" : "text-lg"}`}>
          {product.name}
        </p>
        <p className="text-sm text-muted">{PRODUCT_BRAND}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {product.category && <Badge>{product.category}</Badge>}
          <Badge variant={product.stock < 10 ? "warning" : "success"}>
            Stock : {product.stock}
          </Badge>
        </div>
        <p className="mt-2 font-mono text-xs text-muted">{product.barcode}</p>
        {product.description && !compact && (
          <p className="mt-2 text-sm text-muted line-clamp-2">{product.description}</p>
        )}
        <p className={`font-bold text-primary ${compact ? "mt-1 text-lg" : "mt-3 text-2xl"}`}>
          {formatCurrency(product.price)}
        </p>
      </div>
    </div>
  );
}

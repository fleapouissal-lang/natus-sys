import { ProductImage } from "@/components/pos/product-image";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function ProductCatalog({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (product: Product) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-muted">Aucun produit disponible</p>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onSelect(product)}
          disabled={product.stock <= 0}
          className="flex flex-col border border-border bg-surface text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <div className="flex justify-center border-b border-border bg-background p-4">
            <ProductImage product={product} size="md" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-3">
            <p className="line-clamp-2 text-sm font-semibold leading-tight">
              {product.name}
            </p>
            {product.category && (
              <Badge className="w-fit">{product.category}</Badge>
            )}
            <p className="text-base font-bold text-primary">
              {formatCurrency(product.price)}
            </p>
            <Badge
              variant={
                product.stock <= 0
                  ? "danger"
                  : product.stock < 10
                    ? "warning"
                    : "success"
              }
              className="w-fit"
            >
              {product.stock <= 0 ? "Rupture" : `${product.stock} en stock`}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

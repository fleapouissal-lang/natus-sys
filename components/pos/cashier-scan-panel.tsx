"use client";

import { useState } from "react";
import { ShoppingCart, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_BRAND } from "@/lib/constants/products";
import type { Product } from "@/lib/types";

export function CashierScanPanel({
  product,
  onAdd,
  onClose,
}: {
  product: Product;
  onAdd: (product: Product, quantity: number) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const maxQty = product.stock;

  function handleAdd() {
    if (quantity < 1 || quantity > maxQty) return;
    onAdd(product, quantity);
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Produit scanné</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <ProductImage product={product} size="lg" />
          <div className="text-center">
            <p className="text-xl font-semibold">{product.name}</p>
            <p className="text-sm text-muted">{PRODUCT_BRAND} · {product.category}</p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {formatCurrency(product.price)}
            </p>
          </div>
          <Badge variant={product.stock > 0 ? "success" : "danger"}>
            {product.stock > 0 ? `${product.stock} en stock` : "Rupture"}
          </Badge>
        </div>

        {product.stock > 0 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Quantité à vendre</label>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-md border border-border hover:bg-primary/10 cursor-pointer"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-16 text-center text-3xl font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-md border border-border hover:bg-primary/10 cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-center text-sm text-muted">
                Sous-total : {formatCurrency(product.price * quantity)}
              </p>
            </div>

            <Button className="w-full" size="lg" onClick={handleAdd}>
              <ShoppingCart className="h-5 w-5" />
              Ajouter au panier
            </Button>
          </div>
        )}
    </Modal>
  );
}

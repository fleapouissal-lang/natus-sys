"use client";

import { useState } from "react";
import { MapPin, Package, AlertTriangle, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import { CreateStoreForm } from "@/components/stores/create-store-form";
import { formatCurrency } from "@/lib/utils";
import type { Product, StoreWithStats } from "@/lib/types";

function StoreInventoryTable({
  storeId,
  products,
}: {
  storeId: string;
  products: Product[];
}) {
  const storeProducts = products.filter((p) => p.stock >= 0);

  if (storeProducts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">Aucun produit en stock</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-border bg-primary-light/50">
            <th className="px-4 py-2 text-left font-medium text-muted">Produit</th>
            <th className="px-4 py-2 text-left font-medium text-muted">Catégorie</th>
            <th className="px-4 py-2 text-right font-medium text-muted">Prix</th>
            <th className="px-4 py-2 text-right font-medium text-muted">Stock</th>
          </tr>
        </thead>
        <tbody>
          {storeProducts.map((product) => (
            <tr key={`${storeId}-${product.id}`} className="border-b border-border">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <ProductImage product={product} size="sm" />
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="font-mono text-xs text-muted">{product.barcode}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-muted">{product.category || "—"}</td>
              <td className="px-4 py-4 text-right">{formatCurrency(product.price)}</td>
              <td className="px-4 py-3 text-right">
                <Badge
                  variant={
                    product.stock === 0
                      ? "danger"
                      : product.stock < 10
                        ? "warning"
                        : "success"
                  }
                >
                  {product.stock}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StoreCard({
  store,
  products,
}: {
  store: StoreWithStats;
  products: Product[];
}) {
  const [expanded, setExpanded] = useState(false);
  const activeCashiers = store.cashiers.filter((c) => c.is_active);
  const hasCashier = activeCashiers.length > 0;

  return (
    <Card padding={false}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between p-6 text-left cursor-pointer hover:bg-primary/5 transition-colors"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{store.name}</h3>
            <Badge>{store.city}</Badge>
          </div>
          <p className="text-sm text-muted">{store.address || store.city}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge>
              <Package className="mr-1 h-3 w-3" />
              {store.productCount} produit(s)
            </Badge>
            <Badge variant="success">{store.totalUnits} unités</Badge>
            <Badge variant={hasCashier ? "success" : "danger"}>
              <Users className="mr-1 h-3 w-3" />
              {activeCashiers.length} caissier(s)
            </Badge>
            {store.lowStockCount > 0 && (
              <Badge variant="warning">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {store.lowStockCount} stock faible
              </Badge>
            )}
          </div>
          {store.cashiers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {store.cashiers.map((cashier) => (
                <span
                  key={cashier.id}
                  className="text-xs text-muted border border-border px-2 py-0.5"
                >
                  {cashier.full_name || cashier.email}
                  {!cashier.is_active && " (inactif)"}
                </span>
              ))}
            </div>
          )}
          {!hasCashier && (
            <p className="text-xs text-danger">Aucun caissier actif — assignez-en un</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border">
          <StoreInventoryTable storeId={store.id} products={products} />
        </div>
      )}
    </Card>
  );
}

export function StoresManager({
  stores,
  inventoryByStore,
  allowedCities,
  defaultCity,
  cityLabel,
}: {
  stores: StoreWithStats[];
  inventoryByStore: Record<string, Product[]>;
  allowedCities: string[];
  defaultCity?: string;
  cityLabel?: string;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Magasins</h1>
        <p className="mt-1 text-muted">
          {cityLabel
            ? `Magasins — ${cityLabel}`
            : "Tous les magasins par ville"}
        </p>
      </div>

      <CreateStoreForm allowedCities={allowedCities} defaultCity={defaultCity} />

      <div className="space-y-4">
        {stores.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            products={inventoryByStore[store.id] || []}
          />
        ))}
      </div>

      {stores.length === 0 && (
        <Card>
          <CardHeader
            title="Aucun magasin"
            description="Créez un magasin pour commencer"
          />
        </Card>
      )}
    </div>
  );
}

"use client";

import { ManagementStockView } from "@/components/stock/management-stock-view";
import type { Product, Store } from "@/lib/types";

export function DirectorStockManager({
  stores,
  products,
  stockByProductAndStore,
  selectedStoreId,
  canModifyStock,
  canEditTotal,
}: {
  stores: Store[];
  products: Product[];
  stockByProductAndStore?: Record<string, Record<string, number>>;
  selectedStoreId: string | null;
  canModifyStock: boolean;
  canEditTotal: boolean;
}) {
  return (
    <ManagementStockView
      basePath="/director"
      stores={stores}
      products={products}
      stockByProductAndStore={stockByProductAndStore}
      selectedStoreId={selectedStoreId}
      canModifyStock={canModifyStock}
      canEditTotal={canEditTotal}
    />
  );
}

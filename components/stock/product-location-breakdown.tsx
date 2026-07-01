"use client";

import { useMemo } from "react";
import { Store as StoreIcon, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Store } from "@/lib/types";

/**
 * Répartition du stock d'un produit par site (magasin / dépôt).
 * Affiche la quantité sur chaque site visible + le total.
 */
export function ProductLocationBreakdown({
  productId,
  stores,
  stockByProductAndStore,
}: {
  productId: string;
  stores: Store[];
  stockByProductAndStore: Record<string, Record<string, number>>;
}) {
  const rows = useMemo(() => {
    const byStore = stockByProductAndStore[productId] ?? {};
    return [...stores]
      .sort((a, b) => {
        if (a.is_hub !== b.is_hub) return a.is_hub ? 1 : -1;
        return a.name.localeCompare(b.name, "fr");
      })
      .map((store) => ({ store, stock: byStore[store.id] ?? 0 }));
  }, [productId, stores, stockByProductAndStore]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.stock, 0), [rows]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted">Répartition par site indisponible.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-primary-light/30">
            <th className="px-4 py-3 text-left font-medium text-muted">Site</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Type</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Ville</th>
            <th className="px-4 py-3 text-right font-medium text-muted">Stock</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ store, stock }) => (
            <tr key={store.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 font-medium">{store.name}</td>
              <td className="px-4 py-3 text-muted">
                {store.is_hub ? (
                  <span className="inline-flex items-center gap-1">
                    <Warehouse className="h-3.5 w-3.5" />
                    Dépôt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <StoreIcon className="h-3.5 w-3.5" />
                    Magasin
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted">{store.city}</td>
              <td className="px-4 py-3 text-right">
                <Badge
                  variant={stock === 0 ? "danger" : stock < 10 ? "warning" : "success"}
                >
                  {stock}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-primary-light/40 font-semibold">
            <td colSpan={3} className="px-4 py-3 text-right">
              Total ({rows.length} site{rows.length !== 1 ? "s" : ""})
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

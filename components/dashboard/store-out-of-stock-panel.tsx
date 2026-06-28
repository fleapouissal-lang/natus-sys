"use client";

import Link from "next/link";
import { AlertCircle, PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import type { StoreOutOfStockProduct } from "@/lib/types";

export function StoreOutOfStockPanel({
  products,
  storeLabel,
  stockHref,
}: {
  products: StoreOutOfStockProduct[];
  storeLabel: string;
  stockHref?: string;
}) {
  return (
    <Card padding={false} className="overflow-hidden border-danger/25">
      <div className="border-b border-border bg-danger/5 px-4 py-4 sm:px-6">
        <CardHeader
          title="Produits en rupture"
          description={`${storeLabel} · ${products.length} référence${products.length !== 1 ? "s" : ""} à 0 unité`}
          className="gap-1"
        />
      </div>

      {products.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-8 text-sm text-muted sm:px-6">
          <PackageX className="h-5 w-5 shrink-0 text-success" />
          Aucune rupture de stock sur ce magasin.
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <ul className="divide-y divide-border">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-xs text-muted">
                    {[product.category, product.barcode].filter(Boolean).join(" · ") ||
                      "Sans catégorie"}
                  </p>
                </div>
                <Badge variant="danger" className="shrink-0">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Rupture
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stockHref && products.length > 0 && (
        <div className="border-t border-border px-4 py-3 sm:px-6">
          <Link href={stockHref} className="text-sm font-medium text-primary hover:underline">
            Gérer le stock du magasin →
          </Link>
        </div>
      )}
    </Card>
  );
}

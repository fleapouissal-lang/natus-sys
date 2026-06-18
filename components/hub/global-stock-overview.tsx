"use client";

import { useMemo, useState } from "react";
import { Package, Search, Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SelectMenu } from "@/components/ui/select-menu";
import { ProductImage } from "@/components/pos/product-image";
import { categoryOptions } from "@/lib/select-options";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product } from "@/lib/types";

export function GlobalStockOverview({
  products,
  storeCount,
}: {
  products: Product[];
  storeCount: number;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.category !== category) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.barcode.toLowerCase().includes(q) ||
        (product.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [products, search, category]);

  const filterToken = `${search}|${category}`;
  const {
    paginated: paginatedProducts,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(filteredProducts, DEFAULT_PAGE_SIZE, filterToken);

  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stock, 0),
    [products]
  );
  const inStockCount = useMemo(
    () => products.filter((p) => p.stock > 0).length,
    [products]
  );

  const hasFilters = Boolean(search || category);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Magasins actifs</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <Store className="h-7 w-7 text-primary" />
            {storeCount}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Produits en stock</p>
          <p className="mt-1 text-3xl font-bold">
            {inStockCount}
            <span className="ml-1 text-base font-normal text-muted">
              / {products.length}
            </span>
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Unités totales (tous magasins)</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <Package className="h-7 w-7 text-primary" />
            {totalUnits}
          </p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="natus-filter-bar overflow-visible border-b border-border p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-primary">
              Stock global — tous les magasins
            </p>
            <div className="flex items-center gap-3">
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                  }}
                  className="cursor-pointer text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  Tout effacer
                </button>
              )}
              <p className="text-sm text-muted">
                <span className="font-semibold text-foreground">
                  {filteredProducts.length}
                </span>{" "}
                produit{filteredProducts.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:items-end">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Nom ou code-barres
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom, code-barres..."
                  className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
                />
              </div>
            </div>
            <SelectMenu
              label="Catégorie"
              value={category}
              onChange={setCategory}
              options={categoryOptions(PRODUCT_CATEGORIES)}
              size="sm"
              showIcons={false}
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Aucun produit ne correspond à votre recherche
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/50">
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    Produit
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    Catégorie
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted">
                    Prix
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted">
                    Stock total
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage product={product} size="sm" />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="font-mono text-xs text-muted">
                            {product.barcode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {product.category || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(product.price)}
                    </td>
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
        )}
        {filteredProducts.length > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}

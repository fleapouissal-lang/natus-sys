"use client";

import { useMemo, useState } from "react";
import { Package, Search, Store as StoreIcon, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SelectMenu } from "@/components/ui/select-menu";
import { ProductImage } from "@/components/pos/product-image";
import { ProductLocationBreakdown } from "@/components/stock/product-location-breakdown";
import { categoryOptions, productPickOptions } from "@/lib/select-options";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { formatCurrency } from "@/lib/utils";
import { INVENTORY_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product, Store } from "@/lib/types";

function productMatchesCategory(product: Product, category: string): boolean {
  if (!category) return true;
  if (product.category === category) return true;
  if (product.categories?.includes(category)) return true;
  if (product.parent_category === category) return true;
  if (product.parent_categories?.includes(category)) return true;
  return false;
}

export function GlobalStockOverview({
  products,
  stores = [],
  stockByProductAndStore,
  storeCount,
  retailStoreCount,
  hubStoreCount = 0,
}: {
  products: Product[];
  stores?: Store[];
  stockByProductAndStore?: Record<string, Record<string, number>>;
  storeCount: number;
  retailStoreCount?: number;
  hubStoreCount?: number;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  const sortedStores = useMemo(
    () =>
      [...stores].sort((a, b) => {
        if (a.is_hub !== b.is_hub) return a.is_hub ? 1 : -1;
        return a.name.localeCompare(b.name, "fr");
      }),
    [stores]
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId]
  );

  const productOptions = useMemo(() => {
    const list = category
      ? products.filter((product) => productMatchesCategory(product, category))
      : products;
    return productPickOptions(
      [...list].sort((a, b) => a.name.localeCompare(b.name, "fr"))
    );
  }, [products, category]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((product) => {
      if (selectedProductId && product.id !== selectedProductId) return false;
      if (!productMatchesCategory(product, category)) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        (product.barcode?.toLowerCase().includes(q) ?? false) ||
        (product.category?.toLowerCase().includes(q) ?? false)
      );
    });
    return [...list].sort((a, b) => {
      const aZero = a.stock === 0;
      const bZero = b.stock === 0;
      if (aZero !== bZero) return aZero ? 1 : -1;
      return a.stock - b.stock || a.name.localeCompare(b.name, "fr");
    });
  }, [products, search, category, selectedProductId]);

  const siteBreakdown = useMemo(() => {
    if (!selectedProductId || !stockByProductAndStore || sortedStores.length === 0) {
      return [];
    }
    const byStore = stockByProductAndStore[selectedProductId] ?? {};
    return sortedStores.map((store) => ({
      store,
      stock: byStore[store.id] ?? 0,
    }));
  }, [selectedProductId, stockByProductAndStore, sortedStores]);

  const siteBreakdownTotal = useMemo(
    () => siteBreakdown.reduce((sum, row) => sum + row.stock, 0),
    [siteBreakdown]
  );

  const filterToken = `${search}|${category}|${selectedProductId}`;
  const {
    paginated: paginatedProducts,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(filteredProducts, INVENTORY_PAGE_SIZE, filterToken);

  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stock, 0),
    [products]
  );
  const filteredTotalUnits = useMemo(
    () => filteredProducts.reduce((sum, p) => sum + p.stock, 0),
    [filteredProducts]
  );
  const inStockCount = useMemo(
    () => products.filter((p) => p.stock > 0).length,
    [products]
  );

  const hasFilters = Boolean(search || category || selectedProductId);
  const showSiteBreakdown = Boolean(selectedProductId && selectedProduct);
  // Recherche libre → répartition par site pour chaque produit correspondant.
  const showSearchBreakdown =
    !showSiteBreakdown &&
    Boolean(search.trim()) &&
    Boolean(stockByProductAndStore) &&
    sortedStores.length > 0;
  const SEARCH_BREAKDOWN_MAX = 20;

  const retailCount = retailStoreCount ?? storeCount;
  const depotCount = hubStoreCount;

  function clearFilters() {
    setSearch("");
    setCategory("");
    setSelectedProductId("");
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    if (selectedProductId) {
      const product = products.find((item) => item.id === selectedProductId);
      if (product && value && !productMatchesCategory(product, value)) {
        setSelectedProductId("");
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Magasins retail</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <StoreIcon className="h-7 w-7 text-primary" />
            {retailCount}
          </p>
        </Card>
        {depotCount > 0 && (
          <Card>
            <p className="text-sm text-muted">Dépôts / entrepôts</p>
            <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
              <Package className="h-7 w-7 text-primary" />
              {depotCount}
            </p>
          </Card>
        )}
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
          <p className="text-sm text-muted">Unités totales (réseau)</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <Package className="h-7 w-7 text-primary" />
            {totalUnits}
          </p>
          <p className="mt-1 text-xs text-muted">
            Somme de tous les magasins et dépôts actifs
          </p>
        </Card>
      </div>

      <Card padding={false}>
        <FilterTogglePanel
          toggleLabel="Filtres stock"
          summary={
            showSiteBreakdown
              ? `Produit : ${selectedProduct?.name}`
              : `${filteredProducts.length} produit${filteredProducts.length !== 1 ? "s" : ""}`
          }
        >
          <div className="natus-filter-bar overflow-visible border-b border-border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-primary">
                Tous les sites — filtrer par catégorie ou par produit
              </p>
              <div className="flex items-center gap-3">
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="cursor-pointer text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-end">
              <SelectMenu
                label="Catégorie"
                value={category}
                onChange={handleCategoryChange}
                options={categoryOptions(PRODUCT_CATEGORIES)}
                size="sm"
                showIcons={false}
              />
              <SelectMenu
                label="Produit"
                value={selectedProductId}
                onChange={setSelectedProductId}
                options={productOptions}
                size="sm"
                searchable
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Recherche libre
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom, code-barres…"
                    className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </FilterTogglePanel>

        {showSiteBreakdown ? (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-start gap-4">
              <ProductImage product={selectedProduct!} size="md" />
              <div>
                <p className="text-lg font-semibold">{selectedProduct!.name}</p>
                <p className="font-mono text-xs text-muted">
                  {selectedProduct!.barcode || "—"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {selectedProduct!.category || "Sans catégorie"} · Stock total réseau :{" "}
                  <span className="font-semibold text-foreground">
                    {selectedProduct!.stock}
                  </span>
                </p>
              </div>
            </div>

            {siteBreakdown.length === 0 ? (
              <p className="text-sm text-muted">
                Répartition par site indisponible pour ce produit.
              </p>
            ) : (
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
                    {siteBreakdown.map(({ store, stock }) => (
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
                            variant={
                              stock === 0 ? "danger" : stock < 10 ? "warning" : "success"
                            }
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
                        Total ({siteBreakdown.length} site
                        {siteBreakdown.length !== 1 ? "s" : ""})
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{siteBreakdownTotal}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Aucun produit ne correspond à votre recherche
          </p>
        ) : showSearchBreakdown ? (
          <div className="space-y-6 p-6">
            <p className="text-sm text-muted">
              Répartition du stock par site pour votre recherche.
            </p>
            {filteredProducts.slice(0, SEARCH_BREAKDOWN_MAX).map((product) => (
              <div key={product.id} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="font-mono text-xs text-muted">
                      {product.barcode || "—"}
                    </p>
                  </div>
                  <p className="text-sm text-muted">
                    Stock total réseau :{" "}
                    <span className="font-semibold text-foreground">{product.stock}</span>
                  </p>
                </div>
                <ProductLocationBreakdown
                  productId={product.id}
                  stores={sortedStores}
                  stockByProductAndStore={stockByProductAndStore!}
                />
              </div>
            ))}
            {filteredProducts.length > SEARCH_BREAKDOWN_MAX && (
              <p className="text-center text-xs text-muted">
                {filteredProducts.length - SEARCH_BREAKDOWN_MAX} autre
                {filteredProducts.length - SEARCH_BREAKDOWN_MAX !== 1 ? "s" : ""} produit
                {filteredProducts.length - SEARCH_BREAKDOWN_MAX !== 1 ? "s" : ""} — affinez la
                recherche pour l&apos;afficher.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/50">
                  <th className="px-4 py-3 text-left font-medium text-muted">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Catégorie</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Prix</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">
                    Stock total
                    <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-muted">
                      magasins + dépôts
                    </span>
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
                          <p className="font-mono text-xs text-muted">{product.barcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{product.category || "—"}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(product.price)}</td>
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
              <tfoot>
                <tr className="border-t-2 border-border bg-primary-light/40 font-semibold">
                  <td colSpan={3} className="px-4 py-3 text-right text-foreground">
                    Total unités{hasFilters ? " (filtre actif)" : ""}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{filteredTotalUnits}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {!showSiteBreakdown && !showSearchBreakdown && filteredProducts.length > 0 && (
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

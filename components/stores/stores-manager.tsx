"use client";

import { useMemo, useState } from "react";
import {
  MapPin,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  Search,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelectMenu } from "@/components/ui/select-menu";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ProductImage } from "@/components/pos/product-image";
import { CreateStoreForm } from "@/components/stores/create-store-form";
import { categoryOptions } from "@/lib/select-options";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { formatCurrency } from "@/lib/utils";
import { STORE_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product, StoreWithStats } from "@/lib/types";

function StoreInventoryTable({
  storeId,
  products,
  filterToken,
}: {
  storeId: string;
  products: Product[];
  filterToken: string;
}) {
  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(products, STORE_PAGE_SIZE, filterToken);

  if (products.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted">
        Aucun produit ne correspond à votre recherche
      </p>
    );
  }

  return (
    <>
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
            {paginated.map((product) => (
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
      <PaginationBar
        page={page}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        totalItems={totalItems}
        onPageChange={setPage}
        className="border-t border-border px-4 py-4"
      />
    </>
  );
}

function StoreProductFilter({
  search,
  category,
  resultCount,
  onSearchChange,
  onCategoryChange,
  onReset,
}: {
  search: string;
  category: string;
  resultCount: number;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onReset: () => void;
}) {
  const hasFilters = Boolean(search || category);

  return (
    <FilterTogglePanel
      toggleLabel="Rechercher un produit"
      summary={`${resultCount} produit${resultCount !== 1 ? "s" : ""}`}
    >
    <div className="natus-filter-bar overflow-visible border-b border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary">Rechercher un produit</p>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline cursor-pointer"
            >
              Tout effacer
            </button>
          )}
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">{resultCount}</span>{" "}
            produit{resultCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:items-end">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Nom ou code-barres</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Nom, code-barres..."
              className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
            />
          </div>
        </div>
        <SelectMenu
          label="Catégorie"
          value={category}
          onChange={onCategoryChange}
          options={categoryOptions(PRODUCT_CATEGORIES)}
          size="sm"
          showIcons={false}
        />
      </div>
    </div>
    </FilterTogglePanel>
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const activeCashiers = store.cashiers.filter((c) => c.is_active);
  const hasCashier = activeCashiers.length > 0;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.category !== category) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        (product.barcode?.toLowerCase().includes(q) ?? false) ||
        (product.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [products, search, category]);

  function toggleExpanded() {
    setExpanded((v) => {
      if (v) {
        setSearch("");
        setCategory("");
      }
      return !v;
    });
  }

  function resetFilters() {
    setSearch("");
    setCategory("");
  }

  return (
    <Card padding={false}>
      <button
        type="button"
        onClick={toggleExpanded}
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
          <StoreProductFilter
            search={search}
            category={category}
            resultCount={filteredProducts.length}
            onSearchChange={setSearch}
            onCategoryChange={setCategory}
            onReset={resetFilters}
          />
          <StoreInventoryTable
            storeId={store.id}
            products={filteredProducts}
            filterToken={`${search}|${category}`}
          />
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
  const {
    paginated: paginatedStores,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(stores, STORE_PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Magasins</h1>
        <p className="mt-1 text-muted">
          {cityLabel
            ? `Magasins — ${cityLabel}`
            : "Tous les magasins par ville"}
          {stores.length > 0 ? ` · ${stores.length} magasin${stores.length !== 1 ? "s" : ""}` : ""}
        </p>
      </div>

      <CreateStoreForm allowedCities={allowedCities} defaultCity={defaultCity} />

      <div className="space-y-4">
        {paginatedStores.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            products={inventoryByStore[store.id] || []}
          />
        ))}
      </div>

      {stores.length > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalItems={totalItems}
          onPageChange={setPage}
          className="rounded-lg border border-border bg-surface px-6 py-4"
        />
      )}

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

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Package,
  AlertTriangle,
  Users,
  Search,
  Store,
  Warehouse,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ProductImage } from "@/components/pos/product-image";
import { CreateStoreForm } from "@/components/stores/create-store-form";
import { deleteStore } from "@/lib/actions";
import { categoryOptions } from "@/lib/select-options";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
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
      <p className="px-6 py-10 text-center text-sm text-muted">
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
              <th className="px-6 py-3 text-left font-medium text-muted">Produit</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Catégorie</th>
              <th className="px-6 py-3 text-right font-medium text-muted">Prix</th>
              <th className="px-6 py-3 text-right font-medium text-muted">Stock</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((product) => (
              <tr key={`${storeId}-${product.id}`} className="border-b border-border">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ProductImage product={product} size="sm" className="h-12 w-12 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{product.name}</p>
                      <p className="font-mono text-xs text-muted">{product.barcode}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted">{product.category || "—"}</td>
                <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(product.price)}</td>
                <td className="px-6 py-4 text-right">
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
        className="border-t border-border px-6 py-4"
      />
    </>
  );
}

function SummaryStat({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof Store;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const toneClasses = {
    default: "border-border bg-surface text-foreground",
    warning: "border-warning/30 bg-warning/5 text-warning",
    success: "border-success/30 bg-success/5 text-success",
    danger: "border-danger/30 bg-danger/5 text-danger",
  } as const;

  return (
    <div className={cn("rounded-xl border p-4", toneClasses[tone])}>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon className="natus-icon h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function StorePickerCard({
  store,
  selected,
  onSelect,
  canDelete = false,
  onDelete,
  deleting = false,
}: {
  store: StoreWithStats;
  selected: boolean;
  onSelect: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const activeCashiers = store.cashiers.filter((c) => c.is_active);
  const showDelete = canDelete && !store.is_hub && onDelete;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-xl border transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/15"
          : "border-border bg-surface hover:border-primary/30 hover:bg-primary/5"
      )}
    >
      <div className="flex items-start gap-2 p-4 pb-2">
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 cursor-pointer text-left text-foreground"
        >
          <div className="flex min-w-0 items-center gap-2">
            {store.is_hub ? (
              <Warehouse className="natus-icon h-5 w-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            ) : (
              <Store className="natus-icon h-5 w-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            )}
            <h3 className="truncate font-semibold leading-tight">{store.name}</h3>
          </div>
        </button>
        <Badge className="shrink-0">{store.city}</Badge>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 cursor-pointer flex-col px-4 pb-4 text-left"
      >
        <p className="line-clamp-2 text-sm text-muted">{store.address || store.city}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-page/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted">Produits</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{store.productCount}</p>
          </div>
          <div className="rounded-lg bg-page/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted">Unités</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{store.totalUnits}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant={activeCashiers.length > 0 ? "success" : "danger"}>
            <Users className="natus-icon mr-1 h-3 w-3" strokeWidth={2} aria-hidden />
            {activeCashiers.length} caissier{activeCashiers.length !== 1 ? "s" : ""}
          </Badge>
          {store.lowStockCount > 0 && (
            <Badge variant="warning">
              <AlertTriangle className="natus-icon mr-1 h-3 w-3" strokeWidth={2} aria-hidden />
              {store.lowStockCount} faible
            </Badge>
          )}
          {store.is_hub && <Badge variant="accent">Dépôt</Badge>}
        </div>
      </button>

      {showDelete && (
        <div className="border-t border-border/70 px-4 py-3">
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={deleting}
            disabled={deleting}
            className="w-full"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
            Supprimer
          </Button>
        </div>
      )}
    </div>
  );
}

function StoreDetailPanel({
  store,
  products,
  canDelete = false,
  onDelete,
  deleting = false,
}: {
  store: StoreWithStats;
  products: Product[];
  canDelete?: boolean;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const activeCashiers = store.cashiers.filter((c) => c.is_active);
  const showDelete = canDelete && !store.is_hub && onDelete;

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

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="border-b border-border bg-gradient-to-b from-primary/5 to-surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MapPin className="natus-icon h-5 w-5 text-primary" strokeWidth={2} aria-hidden />
              <h2 className="text-xl font-semibold">{store.name}</h2>
              <Badge>{store.city}</Badge>
              {store.is_hub && <Badge variant="accent">Dépôt</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted">{store.address || store.city}</p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Badge>
                <Package className="natus-icon mr-1 h-3 w-3" strokeWidth={2} aria-hidden />
                {store.productCount} produit{store.productCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="success">{store.totalUnits} unités</Badge>
              <Badge variant={activeCashiers.length > 0 ? "success" : "danger"}>
                <Users className="natus-icon mr-1 h-3 w-3" strokeWidth={2} aria-hidden />
                {activeCashiers.length} caissier{activeCashiers.length !== 1 ? "s" : ""} actif
                {activeCashiers.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            {showDelete && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={deleting}
                disabled={deleting}
                onClick={onDelete}
                className="w-full sm:w-auto"
              >
                <Trash2 className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
                Supprimer le magasin
              </Button>
            )}
          </div>
        </div>

        {store.cashiers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {store.cashiers.map((cashier) => (
              <span
                key={cashier.id}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted"
              >
                {cashier.full_name || cashier.email}
                {!cashier.is_active && " · inactif"}
              </span>
            ))}
          </div>
        )}

        {!activeCashiers.length && (
          <p className="mt-3 text-sm text-danger">Aucun caissier actif — assignez-en un</p>
        )}
      </div>

      <div className="border-b border-border p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-end">
          <Input
            inputSize="lg"
            icon={Search}
            label="Rechercher un produit"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou code-barres…"
          />
          <SelectMenu
            label="Catégorie"
            value={category}
            onChange={setCategory}
            options={categoryOptions(PRODUCT_CATEGORIES)}
            showIcons={false}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span>
            <span className="font-semibold text-foreground">{filteredProducts.length}</span>{" "}
            produit{filteredProducts.length !== 1 ? "s" : ""} affiché
            {filteredProducts.length !== 1 ? "s" : ""}
          </span>
          {(search || category) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("");
              }}
              className="cursor-pointer font-medium text-primary hover:underline"
            >
              Tout effacer
            </button>
          )}
        </div>
      </div>

      <StoreInventoryTable
        storeId={store.id}
        products={filteredProducts}
        filterToken={`${search}|${category}`}
      />
    </Card>
  );
}

export function StoresManager({
  stores,
  inventoryByStore,
  allowedCities,
  defaultCity,
  cityLabel,
  canCreateStore = false,
  canDeleteStore = false,
}: {
  stores: StoreWithStats[];
  inventoryByStore: Record<string, Product[]>;
  allowedCities: string[];
  defaultCity?: string;
  cityLabel?: string;
  canCreateStore?: boolean;
  canDeleteStore?: boolean;
}) {
  const router = useRouter();
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? "");
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletePending, startDeleteTransition] = useTransition();
  const {
    paginated: paginatedStores,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(stores, STORE_PAGE_SIZE);

  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? stores[0];
  const totalUnits = stores.reduce((sum, store) => sum + store.totalUnits, 0);
  const totalLowStock = stores.reduce((sum, store) => sum + store.lowStockCount, 0);
  const totalActiveCashiers = stores.reduce(
    (sum, store) => sum + store.cashiers.filter((c) => c.is_active).length,
    0
  );

  function handleDeleteStore(store: StoreWithStats) {
    const message = `Supprimer le magasin « ${store.name} » (${store.city}) ?\n\nLe magasin sera désactivé et n'apparaîtra plus dans les listes. L'historique (ventes, transferts…) est conservé.`;

    if (!window.confirm(message)) return;

    setDeleteError("");
    setDeletingStoreId(store.id);

    startDeleteTransition(async () => {
      const result = await deleteStore(store.id);
      setDeletingStoreId(null);

      if ("error" in result) {
        setDeleteError(result.error ?? "Suppression impossible");
        return;
      }

      if (selectedStoreId === store.id) {
        const remaining = stores.filter((item) => item.id !== store.id);
        setSelectedStoreId(remaining[0]?.id ?? "");
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Magasins</h1>
        <p className="mt-1 text-muted">
          {cityLabel ? `Points de vente — ${cityLabel}` : "Tous les magasins et dépôts"}
          {stores.length > 0
            ? ` · ${stores.length} point${stores.length !== 1 ? "s" : ""}`
            : ""}
        </p>
      </div>

      {stores.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Magasins" value={stores.length} icon={Store} />
          <SummaryStat label="Unités en stock" value={totalUnits} icon={Package} tone="success" />
          <SummaryStat
            label="Alertes stock faible"
            value={totalLowStock}
            icon={AlertTriangle}
            tone={totalLowStock > 0 ? "warning" : "default"}
          />
          <SummaryStat
            label="Caissiers actifs"
            value={totalActiveCashiers}
            icon={Users}
            tone={totalActiveCashiers > 0 ? "success" : "danger"}
          />
        </div>
      )}

      {canCreateStore && (
        <CreateStoreForm allowedCities={allowedCities} defaultCity={defaultCity} />
      )}

      {deleteError && (
        <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          {deleteError}
        </p>
      )}

      {stores.length > 0 ? (
        <>
          <Card padding={false}>
            <div className="border-b border-border p-6">
              <CardHeader
                title="Sélectionner un magasin"
                description="Choisissez un point de vente pour voir son inventaire"
              />
            </div>
            <div className="grid gap-3 overflow-visible p-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedStores.map((store) => (
                <StorePickerCard
                  key={store.id}
                  store={store}
                  selected={selectedStore?.id === store.id}
                  onSelect={() => setSelectedStoreId(store.id)}
                  canDelete={canDeleteStore}
                  onDelete={() => handleDeleteStore(store)}
                  deleting={deletePending && deletingStoreId === store.id}
                />
              ))}
            </div>
            {stores.length > STORE_PAGE_SIZE && (
              <PaginationBar
                page={page}
                totalPages={totalPages}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                totalItems={totalItems}
                onPageChange={setPage}
                className="border-t border-border px-6 py-4"
              />
            )}
          </Card>

          {selectedStore && (
            <StoreDetailPanel
              store={selectedStore}
              products={inventoryByStore[selectedStore.id] || []}
              canDelete={canDeleteStore}
              onDelete={() => handleDeleteStore(selectedStore)}
              deleting={deletePending && deletingStoreId === selectedStore.id}
            />
          )}
        </>
      ) : (
        <Card>
          <CardHeader title="Aucun magasin" description="Créez un magasin pour commencer" />
        </Card>
      )}
    </div>
  );
}

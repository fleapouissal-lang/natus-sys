"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Package,
  Search,
  Store as StoreIcon,
  Warehouse,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SelectMenu } from "@/components/ui/select-menu";
import { StoreSelect } from "@/components/stores/store-select";
import { ProductImage } from "@/components/pos/product-image";
import { categoryOptions } from "@/lib/select-options";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { transferStoreStock, transferStoreStockToHub } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product, Store } from "@/lib/types";

type TransferAlert = {
  title: string;
  message: string;
  product?: Product;
  requested?: number;
};

type TransferDestination = "store" | "hub";

export function StoreStockTransferManager({
  stores,
  sourceStores,
  products,
  fromStoreId,
  toStoreId,
  lockFromStore = false,
  basePath,
  hubStores = [],
  toHubStoreId = "",
  enableHubDestination = false,
  initialDestination = "store",
  showAllDestinations = false,
}: {
  stores: Store[];
  sourceStores?: Store[];
  products: Product[];
  fromStoreId: string;
  toStoreId: string;
  lockFromStore?: boolean;
  basePath: "/manager" | "/director";
  hubStores?: Store[];
  toHubStoreId?: string;
  enableHubDestination?: boolean;
  initialDestination?: TransferDestination;
  showAllDestinations?: boolean;
}) {
  const router = useRouter();
  const [destinationType, setDestinationType] = useState<TransferDestination>(
    enableHubDestination && initialDestination === "hub" ? "hub" : "store"
  );

  useEffect(() => {
    setDestinationType(
      enableHubDestination && initialDestination === "hub" ? "hub" : "store"
    );
  }, [enableHubDestination, initialDestination, fromStoreId]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState<TransferAlert | null>(null);

  const fromStoreOptions = sourceStores ?? stores;
  const fromStore = fromStoreOptions.find((s) => s.id === fromStoreId);
  const toStore = stores.find((s) => s.id === toStoreId);
  const selectedHubStore = hubStores.find((s) => s.id === toHubStoreId) ?? null;
  const destinationStores = useMemo(
    () => stores.filter((s) => s.id !== fromStoreId),
    [stores, fromStoreId]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.category !== category) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        (product.barcode?.toLowerCase().includes(q) ?? false) ||
        (product.product_code?.toLowerCase().includes(q) ?? false) ||
        (product.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [products, search, category]);

  const filterToken = `${search}|${category}|${fromStoreId}`;
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

  const transferPayload = useMemo(() => {
    const items = products
      .map((product) => {
        const qty = parseInt(quantities[product.id] || "", 10);
        if (!Number.isFinite(qty) || qty <= 0) return null;
        if (qty > product.stock) {
          return { invalid: { product, requested: qty } };
        }
        return { productId: product.id, quantity: qty };
      })
      .filter(Boolean) as Array<
        { productId: string; quantity: number } | { invalid: { product: Product; requested: number } }
      >;

    const invalid = items.find((item) => "invalid" in item) as
      | { invalid: { product: Product; requested: number } }
      | undefined;
    const payload = items.filter(
      (item): item is { productId: string; quantity: number } => "productId" in item
    );

    return { invalid, payload };
  }, [products, quantities]);

  const transferCount = transferPayload.payload.length;

  const confirmSummary = useMemo(() => {
    const items = transferPayload.payload
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return { product, quantity: item.quantity };
      })
      .filter(Boolean) as Array<{ product: Product; quantity: number }>;

    return {
      items,
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [transferPayload.payload, products]);

  function navigateTransfer(
    nextFrom: string,
    nextTo: string,
    nextDestination = destinationType,
    nextHubId = toHubStoreId
  ) {
    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextDestination === "store" && nextTo) params.set("to", nextTo);
    if (enableHubDestination) {
      params.set("dest", nextDestination);
      if (nextDestination === "hub" && nextHubId) params.set("hub", nextHubId);
    }
    router.push(`${basePath}/stock-transfers?${params.toString()}`);
    router.refresh();
  }

  function handleFromChange(storeId: string) {
    const nextTo =
      storeId && storeId === toStoreId
        ? destinationStores.find((s) => s.id !== storeId)?.id || ""
        : toStoreId;
    setQuantities({});
    setSuccess("");
    navigateTransfer(storeId, nextTo);
  }

  function handleToChange(storeId: string) {
    setQuantities({});
    setSuccess("");
    navigateTransfer(fromStoreId, storeId, "store");
  }

  function handleDestinationChange(nextDestination: TransferDestination) {
    setDestinationType(nextDestination);
    setQuantities({});
    setSuccess("");
    navigateTransfer(fromStoreId, toStoreId, nextDestination, toHubStoreId);
  }

  function handleHubChange(hubId: string) {
    setQuantities({});
    setSuccess("");
    navigateTransfer(fromStoreId, toStoreId, "hub", hubId);
  }

  function showTransferAlert(alert: TransferAlert) {
    setAlertOpen(alert);
  }

  function setProductQty(productId: string, value: string) {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
    setSuccess("");
  }

  function resetTransfer() {
    setQuantities({});
  }

  function openConfirm() {
    setSuccess("");
    setAlertOpen(null);

    if (!fromStoreId) {
      showTransferAlert({
        title: "Magasin source requis",
        message: "Sélectionnez le magasin d'origine du transfert.",
      });
      return;
    }

    if (destinationType === "store" && !toStoreId) {
      showTransferAlert({
        title: "Magasin destination requis",
        message: "Sélectionnez le magasin qui recevra le stock.",
      });
      return;
    }

    if (destinationType === "hub" && !toHubStoreId) {
      showTransferAlert({
        title: "Dépôt requis",
        message: "Sélectionnez le dépôt hub de destination.",
      });
      return;
    }

    if (transferPayload.invalid) {
      const { product, requested } = transferPayload.invalid.invalid;
      showTransferAlert({
        title: "Quantité trop élevée",
        message: "La quantité demandée dépasse le stock disponible au magasin source.",
        product,
        requested,
      });
      return;
    }

    if (transferPayload.payload.length === 0) {
      showTransferAlert({
        title: "Aucune quantité",
        message: "Indiquez au moins une quantité à transférer.",
      });
      return;
    }

    setConfirmOpen(true);
  }

  async function handleTransferConfirm() {
    setLoading(true);
    const result =
      destinationType === "hub"
        ? await transferStoreStockToHub(
            fromStoreId,
            transferPayload.payload,
            undefined,
            toHubStoreId
          )
        : await transferStoreStock(
            fromStoreId,
            toStoreId,
            transferPayload.payload
          );
    setLoading(false);
    setConfirmOpen(false);

    if ("error" in result) {
      showTransferAlert({
        title: "Transfert impossible",
        message: result.error,
      });
      return;
    }

    resetTransfer();
    setSuccess(
      destinationType === "hub"
        ? `Commande créée vers ${"hubStoreName" in result ? result.hubStoreName : "dépôt"} — statut « En cours ». Marquez-la prête puis assignez un livreur.`
        : `Commande créée vers ${"toStoreName" in result ? result.toStoreName : "magasin"} — statut « En cours ». Validez l'expédition depuis la liste ci-dessous.`
    );
    router.refresh();
  }

  const canTransferStore =
    fromStoreOptions.length >= 1 && destinationStores.length > 0;
  const canTransferHub = Boolean(fromStoreId && toHubStoreId && hubStores.length > 0);
  const canTransfer =
    destinationType === "hub" ? canTransferHub : canTransferStore;
  const destinationName =
    destinationType === "hub" ? selectedHubStore?.name : toStore?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfert de stock</h1>
        <p className="mt-1 text-muted">
          {enableHubDestination
            ? showAllDestinations
              ? "Choisissez votre magasin source, puis envoyez le stock vers n'importe quel autre magasin ou dépôt hub actif."
              : "Envoyez du stock d'un magasin vers un autre magasin ou vers un dépôt hub."
            : "Déplacez du stock d'un magasin vers un autre magasin de vente."}
        </p>
      </div>

      {destinationType === "store" && !canTransferStore && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm">
            {fromStoreOptions.length === 0
              ? "Aucun magasin source ne vous est associé."
              : "Aucun magasin destination disponible."}
          </p>
        </Card>
      )}

      {destinationType === "hub" && hubStores.length === 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm">
            Aucun dépôt hub actif. Contactez le directeur.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Produits au magasin source</p>
          <p className="mt-1 text-3xl font-bold">{products.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Unités disponibles</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <Package className="h-7 w-7 text-primary" />
            {totalUnits}
          </p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Nouveau transfert</h2>
          </div>

          <div
            className={`grid grid-cols-1 gap-3 lg:items-end ${
              enableHubDestination ? "lg:grid-cols-4" : "lg:grid-cols-3"
            }`}
          >
            <StoreSelect
              stores={
                lockFromStore
                  ? fromStoreOptions.filter((s) => s.id === fromStoreId)
                  : fromStoreOptions
              }
              value={fromStoreId}
              onChange={handleFromChange}
              label="Magasin source"
              size="sm"
            />
            {enableHubDestination && (
              <SelectMenu
                label="Destination"
                value={destinationType}
                onChange={(value) =>
                  handleDestinationChange(value as TransferDestination)
                }
                options={[
                  { value: "store", label: "Autre magasin" },
                  { value: "hub", label: "Dépôt hub" },
                ]}
                size="sm"
                showIcons={false}
              />
            )}
            {destinationType === "store" ? (
              <StoreSelect
                stores={destinationStores}
                value={toStoreId}
                onChange={handleToChange}
                label="Magasin destination"
                size="sm"
              />
            ) : (
              <StoreSelect
                stores={hubStores}
                value={toHubStoreId}
                onChange={handleHubChange}
                label="Dépôt destination"
                size="sm"
              />
            )}
            <Button
              type="button"
              size="sm"
              className="h-8 w-full shrink-0 whitespace-nowrap"
              loading={loading}
              disabled={!canTransfer}
              onClick={openConfirm}
            >
              Créer commande {transferCount > 0 ? `(${transferCount})` : ""}
            </Button>
          </div>

          {fromStore && destinationName && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              <StoreIcon className="h-4 w-4 shrink-0 text-primary" />
              <span>{fromStore.name}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
              {destinationType === "hub" ? (
                <Warehouse className="h-4 w-4 shrink-0 text-primary" />
              ) : null}
              <span>{destinationName}</span>
            </p>
          )}

          {success && <p className="mt-3 text-sm text-success">{success}</p>}
        </div>

        <FilterTogglePanel
          toggleLabel="Filtrer le stock source"
          summary={`${filteredProducts.length} produit${filteredProducts.length !== 1 ? "s" : ""}`}
        >
          <div className="natus-filter-bar border-b border-border p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:items-end">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Rechercher</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom, code, code-barres…"
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
        </FilterTogglePanel>

        {!fromStoreId ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Sélectionnez un magasin source.
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">Aucun produit</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-primary-light/50">
                    <th className="px-4 py-3 text-left font-medium text-muted">Produit</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Catégorie</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Prix</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Stock source</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">
                      Qté à envoyer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => (
                    <tr key={product.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductImage product={product} size="sm" />
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="font-mono text-xs text-muted">
                              {product.product_code || product.barcode || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{product.category || "—"}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(product.price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{product.stock}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={product.stock}
                          value={quantities[product.id] || ""}
                          onChange={(e) => setProductQty(product.id, e.target.value)}
                          className="natus-field w-24 bg-surface px-2 py-1 text-right text-sm"
                          placeholder="0"
                        />
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
            />
          </>
        )}
      </Card>

      {confirmOpen && fromStore && destinationName && (
        <Modal onClose={() => setConfirmOpen(false)} size="md">
          <h3 className="text-lg font-semibold">
            {destinationType === "hub"
              ? "Confirmer l'envoi au dépôt"
              : "Confirmer la commande"}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {fromStore.name} → {destinationName} · {confirmSummary.totalQty} unité
            {confirmSummary.totalQty !== 1 ? "s" : ""} · statut initial « En cours »
          </p>
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {confirmSummary.items.map(({ product, quantity }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span className="truncate">{product.name}</span>
                <span className="shrink-0 font-medium">× {quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button type="button" loading={loading} onClick={handleTransferConfirm}>
              Confirmer
            </Button>
          </div>
        </Modal>
      )}

      {alertOpen && (
        <Modal onClose={() => setAlertOpen(null)} size="sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <h3 className="font-semibold">{alertOpen.title}</h3>
              <p className="mt-2 text-sm text-muted">{alertOpen.message}</p>
              {alertOpen.product && (
                <p className="mt-2 text-sm font-medium">{alertOpen.product.name}</p>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => setAlertOpen(null)}>
              OK
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

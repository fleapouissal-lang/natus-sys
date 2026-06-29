"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRightLeft, Package, Search, Store as StoreIcon, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SelectMenu } from "@/components/ui/select-menu";
import { StoreSelect } from "@/components/stores/store-select";
import { ProductImage } from "@/components/pos/product-image";
import { StockTransferConfirmModal } from "@/components/stock/stock-transfer-confirm-modal";
import { categoryOptions } from "@/lib/select-options";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { transferHubStock } from "@/lib/actions";
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

export function HubWarehouseManager({
  hubStore,
  products,
  retailStores,
  destinationHubStores = [],
  initialDestination = "store",
  toStoreId: initialToStoreId = "",
  toHubStoreId: initialToHubStoreId = "",
  embedded = false,
}: {
  hubStore: Store;
  products: Product[];
  retailStores: Store[];
  destinationHubStores?: Store[];
  initialDestination?: TransferDestination;
  toStoreId?: string;
  toHubStoreId?: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [destinationType, setDestinationType] = useState<TransferDestination>(
    initialDestination === "hub" ? "hub" : "store"
  );
  const [toStoreId, setToStoreId] = useState(initialToStoreId);
  const [toHubStoreId, setToHubStoreId] = useState(initialToHubStoreId);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState<TransferAlert | null>(null);

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
  const destinationStore = retailStores.find((s) => s.id === toStoreId);
  const destinationHub = destinationHubStores.find((s) => s.id === toHubStoreId) ?? null;
  const destinationId = destinationType === "hub" ? toHubStoreId : toStoreId;
  const destinationName =
    destinationType === "hub"
      ? destinationHub?.name || "le dépôt"
      : destinationStore?.name || "le magasin";

  useEffect(() => {
    setDestinationType(initialDestination === "hub" ? "hub" : "store");
  }, [initialDestination, hubStore.id]);

  useEffect(() => {
    setToStoreId(initialToStoreId);
    setToHubStoreId(initialToHubStoreId);
  }, [initialToStoreId, initialToHubStoreId, hubStore.id]);

  function navigateTransfer(
    nextTo: string,
    nextDestination: TransferDestination,
    nextHubId: string
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "new");
    params.set("dest", nextDestination);
    if (nextDestination === "store" && nextTo) params.set("to", nextTo);
    else params.delete("to");
    if (nextDestination === "hub" && nextHubId) params.set("hub", nextHubId);
    else params.delete("hub");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleToChange(storeId: string) {
    setToStoreId(storeId);
    setQuantities({});
    setSuccess("");
    navigateTransfer(storeId, "store", toHubStoreId);
  }

  function handleHubChange(hubId: string) {
    setToHubStoreId(hubId);
    setQuantities({});
    setSuccess("");
    navigateTransfer(toStoreId, "hub", hubId);
  }

  function handleDestinationChange(nextDestination: TransferDestination) {
    setDestinationType(nextDestination);
    setQuantities({});
    setSuccess("");
    navigateTransfer(toStoreId, nextDestination, toHubStoreId);
  }

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

  function showTransferAlert(alert: TransferAlert) {
    setAlertOpen(alert);
  }

  function setProductQty(productId: string, value: string) {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
    setSuccess("");
  }

  function resetTransfer() {
    setQuantities({});
    setSuccess("");
  }

  function openConfirm() {
    setSuccess("");
    setAlertOpen(null);

    if (destinationType === "store" && !toStoreId) {
      showTransferAlert({
        title: "Magasin requis",
        message: "Sélectionnez un magasin destination avant d'envoyer la commande.",
      });
      return;
    }

    if (destinationType === "hub" && !toHubStoreId) {
      showTransferAlert({
        title: "Dépôt requis",
        message: "Sélectionnez un dépôt destination avant d'envoyer la commande.",
      });
      return;
    }

    if (transferPayload.invalid) {
      const { product, requested } = transferPayload.invalid.invalid;
      showTransferAlert({
        title: "Quantité trop élevée",
        message: `La quantité demandée dépasse le stock disponible en entrepôt pour ce produit.`,
        product,
        requested,
      });
      return;
    }

    if (transferPayload.payload.length === 0) {
      showTransferAlert({
        title: "Aucune quantité",
        message: "Indiquez au moins une quantité à envoyer dans le tableau ci-dessous.",
      });
      return;
    }

    setConfirmOpen(true);
  }

  async function handleTransferConfirm() {
    setLoading(true);
    const result = await transferHubStock(
      destinationId,
      transferPayload.payload,
      undefined,
      hubStore.id
    );
    setLoading(false);
    setConfirmOpen(false);

    if ("error" in result) {
      showTransferAlert({
        title: "Envoi impossible",
        message: result.error,
      });
      return;
    }

    resetTransfer();
    const tab = destinationType === "hub" ? "depot" : "store";
    const params = new URLSearchParams(searchParams.toString());
    params.set("created", "1");
    params.set("tab", tab);
    params.set("dest", destinationType);
    if (destinationType === "store" && toStoreId) params.set("to", toStoreId);
    if (destinationType === "hub" && toHubStoreId) params.set("hub", toHubStoreId);
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  const canTransferStore = retailStores.length > 0;
  const canTransferHub = destinationHubStores.length > 0;
  const canTransfer = destinationType === "hub" ? canTransferHub : canTransferStore;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entrepôt dépôt</h1>
          <p className="mt-1 text-muted">
            {hubStore.name} — {hubStore.city}
          </p>
        </div>
      )}

      {embedded && (
        <p className="text-sm text-muted">
          Source : <strong>{hubStore.name}</strong> — envoi vers tout magasin ou dépôt actif.
        </p>
      )}

      {destinationType === "store" && !canTransferStore && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm">Aucun magasin retail actif disponible.</p>
        </Card>
      )}

      {destinationType === "hub" && !canTransferHub && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm">Aucun autre dépôt hub actif disponible.</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Produits en entrepôt</p>
          <p className="mt-1 text-3xl font-bold">{products.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Unités totales</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <Package className="h-7 w-7 text-primary" />
            {totalUnits}
          </p>
        </Card>
      </div>

      {!canTransferStore && !canTransferHub && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm">Aucune destination active disponible pour ce transfert.</p>
        </Card>
      )}

      <Card padding={false}>
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Nouveau transfert depuis l&apos;entrepôt</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-end">
            <SelectMenu
              label="Destination"
              value={destinationType}
              onChange={(value) => handleDestinationChange(value as TransferDestination)}
              options={[
                { value: "store", label: "Magasin" },
                { value: "hub", label: "Dépôt hub" },
              ]}
              size="sm"
              showIcons={false}
            />
            {destinationType === "store" ? (
              <StoreSelect
                stores={retailStores}
                value={toStoreId}
                onChange={handleToChange}
                label="Magasin destination"
                required={false}
                size="sm"
              />
            ) : (
              <StoreSelect
                stores={destinationHubStores}
                value={toHubStoreId}
                onChange={handleHubChange}
                label="Dépôt destination"
                required={false}
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
              <Warehouse className="h-4 w-4" />
              Envoyer {transferCount > 0 ? `(${transferCount})` : ""}
            </Button>
          </div>
          {success && <p className="mt-3 text-sm text-success">{success}</p>}
        </div>

        <FilterTogglePanel
          toggleLabel="Filtrer le stock"
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
                    placeholder="Nom, code-barres…"
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

        {filteredProducts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">Aucun produit</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/50">
                  <th className="px-4 py-3 text-left font-medium text-muted">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Catégorie</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Prix</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Stock entrepôt</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Qté commande</th>
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
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={product.stock}
                        value={quantities[product.id] || ""}
                        onChange={(e) => setProductQty(product.id, e.target.value)}
                        disabled={!canTransfer || product.stock === 0}
                        placeholder="0"
                        className="natus-field w-24 bg-surface px-2 py-1 text-right text-sm disabled:opacity-50"
                      />
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

      {alertOpen && (
        <Modal onClose={() => setAlertOpen(null)} size="md" className="!p-0 overflow-hidden">
          <div className="border-b border-warning/25 bg-gradient-to-br from-warning/10 via-surface to-surface px-6 py-5 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-warning/30 bg-warning/15 text-warning">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-warning">
                  Vérification commande
                </p>
                <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                  {alertOpen.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{alertOpen.message}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5 sm:px-8">
            {alertOpen.product && (
              <div className="rounded-2xl border border-warning/25 bg-warning/5 p-4">
                <div className="flex items-start gap-4">
                  <ProductImage
                    product={alertOpen.product}
                    size="sm"
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-page"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                      Produit concerné
                    </p>
                    <p className="mt-1 text-base font-semibold leading-snug text-foreground">
                      {alertOpen.product.name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted">{alertOpen.product.barcode}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-border bg-page px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                          Stock entrepôt
                        </p>
                        <p className="mt-1 text-lg font-bold text-foreground">
                          {alertOpen.product.stock}
                        </p>
                      </div>
                      {typeof alertOpen.requested === "number" && (
                        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-warning">
                            Quantité demandée
                          </p>
                          <p className="mt-1 text-lg font-bold text-warning">
                            {alertOpen.requested}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-muted">
              Corrigez la quantité dans le tableau, puis relancez l&apos;envoi.
            </p>
          </div>

          <div className="flex justify-end border-t border-border bg-page/50 px-6 py-4 sm:px-8">
            <Button type="button" onClick={() => setAlertOpen(null)} className="min-w-[140px]">
              Compris
            </Button>
          </div>
        </Modal>
      )}

      {confirmOpen && (
        <StockTransferConfirmModal
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void handleTransferConfirm()}
          loading={loading}
          from={{ name: hubStore.name, city: hubStore.city, siteType: "hub" }}
          to={{
            name: destinationName,
            city:
              (destinationType === "hub" ? destinationHub?.city : destinationStore?.city) ||
              hubStore.city,
            siteType: destinationType,
          }}
          items={confirmSummary.items}
          totalQty={confirmSummary.totalQty}
        />
      )}
    </div>
  );
}

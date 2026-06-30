"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRightLeft,
  Search,
  Warehouse,
} from "lucide-react";
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
import {
  transferHubStockAsDirector,
  transferStoreStock,
  transferStoreStockToHub,
} from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product, Store } from "@/lib/types";

type SiteType = "store" | "hub";

type TransferAlert = {
  title: string;
  message: string;
  product?: Product;
  requested?: number;
};

export function DirectorStockTransferManager({
  retailStores,
  hubStores,
  products,
  sourceType: initialSourceType,
  destType: initialDestType,
  fromStoreId: initialFromStoreId,
  fromHubStoreId: initialFromHubStoreId,
  toStoreId: initialToStoreId,
  toHubStoreId: initialToHubStoreId,
}: {
  retailStores: Store[];
  hubStores: Store[];
  products: Product[];
  sourceType: SiteType;
  destType: SiteType;
  fromStoreId: string;
  fromHubStoreId: string;
  toStoreId: string;
  toHubStoreId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sourceType, setSourceType] = useState<SiteType>(initialSourceType);
  const [destType, setDestType] = useState<SiteType>(initialDestType);
  const [fromStoreId, setFromStoreId] = useState(initialFromStoreId);
  const [fromHubStoreId, setFromHubStoreId] = useState(initialFromHubStoreId);
  const [toStoreId, setToStoreId] = useState(initialToStoreId);
  const [toHubStoreId, setToHubStoreId] = useState(initialToHubStoreId);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState<TransferAlert | null>(null);

  useEffect(() => {
    setSourceType(initialSourceType);
    setDestType(initialDestType);
    setFromStoreId(initialFromStoreId);
    setFromHubStoreId(initialFromHubStoreId);
    setToStoreId(initialToStoreId);
    setToHubStoreId(initialToHubStoreId);
  }, [
    initialSourceType,
    initialDestType,
    initialFromStoreId,
    initialFromHubStoreId,
    initialToStoreId,
    initialToHubStoreId,
  ]);

  const destinationRetailStores = useMemo(
    () =>
      retailStores.filter(
        (store) => !(sourceType === "store" && store.id === fromStoreId)
      ),
    [retailStores, sourceType, fromStoreId]
  );

  const destinationHubStores = useMemo(
    () =>
      hubStores.filter(
        (store) => !(sourceType === "hub" && store.id === fromHubStoreId)
      ),
    [hubStores, sourceType, fromHubStoreId]
  );

  const sourceLabel =
    sourceType === "hub"
      ? hubStores.find((store) => store.id === fromHubStoreId)?.name || "Dépôt"
      : retailStores.find((store) => store.id === fromStoreId)?.name || "Magasin";

  const destinationLabel =
    destType === "hub"
      ? destinationHubStores.find((store) => store.id === toHubStoreId)?.name || "Dépôt"
      : destinationRetailStores.find((store) => store.id === toStoreId)?.name || "Magasin";

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

  const filterToken = `${search}|${category}|${sourceType}|${destType}|${fromStoreId}|${fromHubStoreId}`;
  const {
    paginated: paginatedProducts,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(filteredProducts, DEFAULT_PAGE_SIZE, filterToken);

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

  const fromSite = useMemo(() => {
    if (sourceType === "hub") {
      const store = hubStores.find((s) => s.id === fromHubStoreId);
      return {
        name: store?.name || "Dépôt",
        city: store?.city,
        siteType: "hub" as const,
      };
    }
    const store = retailStores.find((s) => s.id === fromStoreId);
    return {
      name: store?.name || "Magasin",
      city: store?.city,
      siteType: "store" as const,
    };
  }, [sourceType, hubStores, fromHubStoreId, retailStores, fromStoreId]);

  const toSite = useMemo(() => {
    if (destType === "hub") {
      const store = destinationHubStores.find((s) => s.id === toHubStoreId);
      return {
        name: store?.name || "Dépôt",
        city: store?.city,
        siteType: "hub" as const,
      };
    }
    const store = destinationRetailStores.find((s) => s.id === toStoreId);
    return {
      name: store?.name || "Magasin",
      city: store?.city,
      siteType: "store" as const,
    };
  }, [destType, destinationHubStores, toHubStoreId, destinationRetailStores, toStoreId]);

  const confirmCopy = useMemo(() => {
    if (sourceType === "hub" && destType === "store") {
      return {
        eyebrow: "Commande entrepôt",
        title: "Confirmer l'envoi",
        description:
          "Vérifiez les produits avant de créer la commande. Le stock dépôt sera déduit lorsque le livreur prendra la commande en charge.",
        actionLabel: "Envoi",
        processDescription:
          "Vous allez créer une commande entrepôt. Le dépôt prépare, le livreur transporte, le magasin valide la réception.",
        sourceStockLabel: "Stock entrepôt",
        confirmLabel: "Confirmer l'envoi",
      };
    }
    if (sourceType === "store" && destType === "hub") {
      return {
        eyebrow: "Retour dépôt",
        title: "Confirmer l'envoi",
        description:
          "Vérifiez les produits avant d'envoyer le stock vers le dépôt.",
        actionLabel: "Envoi",
        processDescription:
          "Le stock sera déduit du magasin source et crédité au dépôt après validation.",
        sourceStockLabel: "Stock magasin",
        confirmLabel: "Confirmer l'envoi",
      };
    }
    if (sourceType === "hub" && destType === "hub") {
      return {
        eyebrow: "Transfert dépôt",
        title: "Confirmer le transfert",
        description: "Vérifiez les produits avant d'envoyer le stock vers l'autre dépôt.",
        actionLabel: "Transfert",
        processDescription:
          "Le stock sera déduit du dépôt source et crédité au dépôt destination après validation.",
        sourceStockLabel: "Stock entrepôt",
        confirmLabel: "Confirmer le transfert",
      };
    }
    return {
      eyebrow: "Transfert de stock",
      title: "Confirmer le transfert",
      description:
        "Vérifiez les produits avant d'envoyer le stock vers l'autre magasin.",
      actionLabel: "Transfert",
      processDescription:
        "Le stock sera déduit du magasin source et crédité au magasin destination après validation.",
      sourceStockLabel: "Stock magasin",
      confirmLabel: "Confirmer le transfert",
    };
  }, [sourceType, destType]);

  function navigate(next: {
    sourceType?: SiteType;
    destType?: SiteType;
    fromStoreId?: string;
    fromHubStoreId?: string;
    toStoreId?: string;
    toHubStoreId?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "new");
    params.set("src", next.sourceType ?? sourceType);
    params.set("dest", next.destType ?? destType);
    if ((next.sourceType ?? sourceType) === "store") {
      params.set("from", next.fromStoreId ?? fromStoreId);
      params.delete("fromHub");
    } else {
      params.set("fromHub", next.fromHubStoreId ?? fromHubStoreId);
      params.delete("from");
    }
    if ((next.destType ?? destType) === "store") {
      params.set("to", next.toStoreId ?? toStoreId);
      params.delete("toHub");
    } else {
      params.set("toHub", next.toHubStoreId ?? toHubStoreId);
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function showTransferAlert(alert: TransferAlert) {
    setAlertOpen(alert);
  }

  function openConfirm() {
    setAlertOpen(null);

    if (sourceType === "store" && !fromStoreId) {
      showTransferAlert({
        title: "Source requise",
        message: "Sélectionnez le magasin source.",
      });
      return;
    }

    if (sourceType === "hub" && !fromHubStoreId) {
      showTransferAlert({
        title: "Source requise",
        message: "Sélectionnez le dépôt source.",
      });
      return;
    }

    if (destType === "store" && !toStoreId) {
      showTransferAlert({
        title: "Destination requise",
        message: "Sélectionnez le magasin destination.",
      });
      return;
    }

    if (destType === "hub" && !toHubStoreId) {
      showTransferAlert({
        title: "Destination requise",
        message: "Sélectionnez le dépôt destination.",
      });
      return;
    }

    const sourceId = sourceType === "hub" ? fromHubStoreId : fromStoreId;
    const destId = destType === "hub" ? toHubStoreId : toStoreId;
    if (sourceId === destId) {
      showTransferAlert({
        title: "Source et destination identiques",
        message: "Choisissez deux sites différents.",
      });
      return;
    }

    if (transferPayload.invalid) {
      const { product, requested } = transferPayload.invalid.invalid;
      showTransferAlert({
        title: "Quantité trop élevée",
        message: "La quantité demandée dépasse le stock disponible à la source.",
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
    let result:
      | { success: true; toStoreName?: string; hubStoreName?: string; storeName?: string }
      | { error: string };

    if (sourceType === "store" && destType === "store") {
      result = await transferStoreStock(
        fromStoreId,
        toStoreId,
        transferPayload.payload
      );
    } else if (sourceType === "store" && destType === "hub") {
      result = await transferStoreStockToHub(
        fromStoreId,
        transferPayload.payload,
        undefined,
        toHubStoreId
      );
    } else if (sourceType === "hub" && destType === "store") {
      result = await transferHubStockAsDirector(
        toStoreId,
        transferPayload.payload,
        undefined,
        fromHubStoreId
      );
    } else {
      result = await transferHubStockAsDirector(
        toHubStoreId,
        transferPayload.payload,
        undefined,
        fromHubStoreId
      );
    }

    setLoading(false);
    setConfirmOpen(false);

    if ("error" in result) {
      showTransferAlert({
        title: "Transfert impossible",
        message: result.error,
      });
      return;
    }

    setQuantities({});

    const params = new URLSearchParams(searchParams.toString());
    params.set("created", "1");
    params.set("tab", "sent");
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  const canTransfer =
    (sourceType === "store" ? Boolean(fromStoreId) : Boolean(fromHubStoreId)) &&
    (destType === "store" ? destinationRetailStores.length > 0 : destinationHubStores.length > 0);

  const stockColumnLabel = sourceType === "hub" ? "Stock dépôt" : "Stock magasin";

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Choisissez librement la source et la destination (magasin ou dépôt hub) pour créer tout
        type de transfert.
      </p>

      <Card padding={false}>
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Nouveau transfert</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:items-end">
            <SelectMenu
              label="Type source"
              value={sourceType}
              onChange={(value) => {
                const next = value as SiteType;
                setSourceType(next);
                setQuantities({});
                navigate({ sourceType: next });
              }}
              options={[
                { value: "store", label: "Magasin" },
                { value: "hub", label: "Dépôt hub" },
              ]}
              size="sm"
              showIcons={false}
            />
            {sourceType === "store" ? (
              <StoreSelect
                stores={retailStores}
                value={fromStoreId}
                onChange={(storeId) => {
                  setFromStoreId(storeId);
                  setQuantities({});
                  navigate({ fromStoreId: storeId });
                }}
                label="Magasin source"
                size="sm"
              />
            ) : (
              <StoreSelect
                stores={hubStores}
                value={fromHubStoreId}
                onChange={(storeId) => {
                  setFromHubStoreId(storeId);
                  setQuantities({});
                  navigate({ fromHubStoreId: storeId });
                }}
                label="Dépôt source"
                size="sm"
              />
            )}

            <SelectMenu
              label="Type destination"
              value={destType}
              onChange={(value) => {
                const next = value as SiteType;
                setDestType(next);
                setQuantities({});
                navigate({ destType: next });
              }}
              options={[
                { value: "store", label: "Magasin" },
                { value: "hub", label: "Dépôt hub" },
              ]}
              size="sm"
              showIcons={false}
            />
            {destType === "store" ? (
              <StoreSelect
                stores={destinationRetailStores}
                value={toStoreId}
                onChange={(storeId) => {
                  setToStoreId(storeId);
                  setQuantities({});
                  navigate({ toStoreId: storeId });
                }}
                label="Magasin destination"
                size="sm"
              />
            ) : (
              <StoreSelect
                stores={destinationHubStores}
                value={toHubStoreId}
                onChange={(storeId) => {
                  setToHubStoreId(storeId);
                  setQuantities({});
                  navigate({ toHubStoreId: storeId });
                }}
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
              <Warehouse className="h-4 w-4" />
              Créer {transferCount > 0 ? `(${transferCount})` : ""}
            </Button>
          </div>

          <p className="mt-3 text-sm text-muted">
            {sourceLabel} → {destinationLabel}
          </p>
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
          <p className="px-6 py-12 text-center text-sm text-muted">
            {products.length === 0
              ? "Sélectionnez une source avec du stock."
              : "Aucun produit ne correspond aux filtres."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/50">
                  <th className="px-4 py-3 text-left font-medium text-muted">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Catégorie</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Prix</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">{stockColumnLabel}</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Qté</th>
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
                        onChange={(e) =>
                          setQuantities((prev) => ({ ...prev, [product.id]: e.target.value }))
                        }
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
        <Modal onClose={() => setAlertOpen(null)} size="md">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <h3 className="font-semibold">{alertOpen.title}</h3>
                <p className="mt-1 text-sm text-muted">{alertOpen.message}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setAlertOpen(null)}>
                Compris
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmOpen && (
        <StockTransferConfirmModal
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void handleTransferConfirm()}
          loading={loading}
          from={fromSite}
          to={toSite}
          items={confirmSummary.items}
          totalQty={confirmSummary.totalQty}
          {...confirmCopy}
        />
      )}
    </div>
  );
}

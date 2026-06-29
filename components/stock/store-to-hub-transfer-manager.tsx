"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
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
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { StoreSelect } from "@/components/stores/store-select";
import { ProductImage } from "@/components/pos/product-image";
import { StockTransferConfirmModal } from "@/components/stock/stock-transfer-confirm-modal";
import { categoryOptions } from "@/lib/select-options";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { transferStoreStockToHub } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product, Store } from "@/lib/types";

type TransferAlert = {
  title: string;
  message: string;
  product?: Product;
  requested?: number;
};

export function StoreToHubTransferManager({
  stores,
  products,
  fromStoreId,
  hubStore,
  lockFromStore = false,
  basePath,
}: {
  stores: Store[];
  products: Product[];
  fromStoreId: string;
  hubStore: Store | null;
  lockFromStore?: boolean;
  basePath: "/manager" | "/director";
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState<TransferAlert | null>(null);

  const fromStore = stores.find((s) => s.id === fromStoreId);

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

  function navigateFromStore(storeId: string) {
    const params = new URLSearchParams();
    if (storeId) params.set("from", storeId);
    router.push(`${basePath}/stock-transfers?${params.toString()}`);
    router.refresh();
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
    setNotes("");
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

    if (!hubStore) {
      showTransferAlert({
        title: "Dépôt introuvable",
        message: "Aucun dépôt hub n'est rattaché à ce magasin.",
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
    const result = await transferStoreStockToHub(
      fromStoreId,
      transferPayload.payload,
      notes
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
      `Commande créée vers ${result.hubStoreName} — statut « En cours ». Marquez-la prête puis assignez un livreur.`
    );
    router.refresh();
  }

  const canTransfer = Boolean(fromStoreId && hubStore);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Retour stock vers le dépôt</h2>
        <p className="mt-1 text-sm text-muted">
          Envoyez du stock d&apos;un de vos magasins vers le dépôt hub rattaché.
        </p>
      </div>

      {!hubStore && fromStoreId && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm">
            Aucun dépôt hub n&apos;est rattaché à ce magasin. Contactez le directeur.
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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <StoreSelect
              stores={
                lockFromStore ? stores.filter((s) => s.id === fromStoreId) : stores
              }
              value={fromStoreId}
              onChange={navigateFromStore}
              label="Magasin source"
              size="sm"
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Dépôt destination</span>
              <div className="flex h-8 items-center gap-2 rounded border border-border bg-page/60 px-3 text-sm">
                <Warehouse className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{hubStore?.name || "—"}</span>
              </div>
            </div>
            <Input
              label="Note (optionnel)"
              inputSize="sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Retour dépôt…"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 w-full shrink-0 whitespace-nowrap lg:w-auto"
              loading={loading}
              disabled={!canTransfer}
              onClick={openConfirm}
            >
              Créer commande {transferCount > 0 ? `(${transferCount})` : ""}
            </Button>
          </div>

          {fromStore && hubStore && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              <StoreIcon className="h-4 w-4 shrink-0 text-primary" />
              <span>{fromStore.name}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
              <span>{hubStore.name}</span>
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
                    <th className="px-4 py-3 text-right font-medium text-muted">Qté à envoyer</th>
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

      {confirmOpen && fromStore && hubStore && (
        <StockTransferConfirmModal
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleTransferConfirm}
          loading={loading}
          from={{ name: fromStore.name, city: fromStore.city, siteType: "store" }}
          to={{ name: hubStore.name, city: hubStore.city, siteType: "hub" }}
          items={confirmSummary.items}
          totalQty={confirmSummary.totalQty}
          eyebrow="Commande entrepôt"
          description="Vérifiez les produits avant de créer la commande. Le stock magasin sera déduit à l'envoi."
          sourceStockLabel="Stock magasin"
        />
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

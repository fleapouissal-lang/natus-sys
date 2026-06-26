"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Package, Search, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { StoreSelect } from "@/components/stores/store-select";
import { ProductImage } from "@/components/pos/product-image";
import { categoryOptions } from "@/lib/select-options";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { transferHubStock } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product, Profile, Store, HubStockTransfer } from "@/lib/types";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";

export function HubWarehouseManager({
  hubStore,
  products,
  retailStores,
  transfers,
  livreurs,
}: {
  hubStore: Store;
  products: Product[];
  retailStores: Store[];
  transfers: HubStockTransfer[];
  livreurs: Profile[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

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
          return { invalid: product.name };
        }
        return { productId: product.id, quantity: qty };
      })
      .filter(Boolean) as Array<{ productId: string; quantity: number } | { invalid: string }>;

    const invalid = items.find((item) => "invalid" in item) as { invalid: string } | undefined;
    const payload = items.filter(
      (item): item is { productId: string; quantity: number } => "productId" in item
    );

    return { invalid, payload };
  }, [products, quantities]);

  const transferCount = transferPayload.payload.length;
  const destinationName = retailStores.find((s) => s.id === toStoreId)?.name || "le magasin";

  function setProductQty(productId: string, value: string) {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
    setError("");
    setSuccess("");
  }

  function resetTransfer() {
    setQuantities({});
    setNotes("");
    setError("");
    setSuccess("");
  }

  function openConfirm() {
    setError("");
    setSuccess("");

    if (!toStoreId) {
      setError("Sélectionnez un magasin destination");
      return;
    }

    if (transferPayload.invalid) {
      setError(`Quantité trop élevée pour ${transferPayload.invalid.invalid}`);
      return;
    }

    if (transferPayload.payload.length === 0) {
      setError("Indiquez au moins une quantité à envoyer");
      return;
    }

    setConfirmOpen(true);
  }

  async function handleTransferConfirm() {
    setLoading(true);
    const result = await transferHubStock(toStoreId, transferPayload.payload, notes);
    setLoading(false);
    setConfirmOpen(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    const storeName = result.storeName || destinationName;
    setSuccess(
      `Commande créée vers ${storeName} — statut En cours (${transferPayload.payload.length} produit${transferPayload.payload.length > 1 ? "s" : ""}). Le stock dépôt sera déduit à la prise en charge par le livreur.`
    );
    resetTransfer();
    router.refresh();
  }

  const canTransfer = retailStores.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Entrepôt dépôt</h1>
        <p className="mt-1 text-muted">
          {hubStore.name} — {hubStore.city}
        </p>
      </div>

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

      {!canTransfer && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm">
            Aucun magasin retail rattaché à ce dépôt. Le directeur doit associer des magasins
            depuis <strong>Comptes dépôt</strong>.
          </p>
        </Card>
      )}

      <Card padding={false}>
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Commande vers un magasin</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <StoreSelect
              stores={retailStores}
              value={toStoreId}
              onChange={setToStoreId}
              label="Magasin destination"
              required={false}
              size="sm"
            />
            <Input
              label="Note (optionnel)"
              inputSize="sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Réapprovisionnement…"
              className="h-8 py-0"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 w-full shrink-0 whitespace-nowrap sm:w-auto"
              loading={loading}
              disabled={!canTransfer}
              onClick={openConfirm}
            >
              <Warehouse className="h-4 w-4" />
              Envoyer {transferCount > 0 ? `(${transferCount})` : ""}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
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

      <HubTransfersList
        transfers={transfers}
        allowRepair
        allowManage
        livreurs={livreurs}
      />

      {confirmOpen && (
        <Modal onClose={() => !loading && setConfirmOpen(false)} size="sm">
          <div className="space-y-5 p-6">
            <div>
              <h3 className="text-lg font-semibold">Confirmer l&apos;envoi</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Créer une commande vers <strong>{destinationName}</strong> avec{" "}
                <strong>{transferCount}</strong> produit{transferCount > 1 ? "s" : ""} ?
              </p>
              <p className="mt-2 text-sm text-muted">
                Le stock dépôt ne sera pas déduit maintenant. Il le sera lorsque le livreur
                prendra la commande en charge.
              </p>
            </div>

            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-page p-3 text-xs text-muted">
              {transferPayload.payload.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <li key={item.productId}>
                    {product?.name || "Produit"} × {item.quantity}
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => setConfirmOpen(false)}
              >
                Modifier
              </Button>
              <Button type="button" loading={loading} onClick={() => void handleTransferConfirm()}>
                Confirmer l&apos;envoi
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

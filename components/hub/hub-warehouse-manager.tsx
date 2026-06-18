"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Package, Search, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { StoreSelect } from "@/components/stores/store-select";
import { ProductImage } from "@/components/pos/product-image";
import { categoryOptions } from "@/lib/select-options";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { transferHubStock } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import type { Product, Profile, Store, HubStockTransfer } from "@/lib/types";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";

export function HubWarehouseManager({
  hubStore,
  products,
  retailStores,
  assignedManagers,
  transfers,
}: {
  hubStore: Store;
  products: Product[];
  retailStores: Store[];
  assignedManagers: Profile[];
  transfers: HubStockTransfer[];
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

  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stock, 0),
    [products]
  );

  const transferCount = useMemo(
    () =>
      Object.values(quantities).filter((v) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n > 0;
      }).length,
    [quantities]
  );

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

  async function handleTransfer() {
    setError("");
    setSuccess("");

    if (!toStoreId) {
      setError("Sélectionnez un magasin destination");
      return;
    }

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
    if (invalid) {
      setError(`Quantité trop élevée pour ${invalid.invalid}`);
      return;
    }

    const payload = items.filter(
      (item): item is { productId: string; quantity: number } => "productId" in item
    );

    if (payload.length === 0) {
      setError("Indiquez au moins une quantité à envoyer");
      return;
    }

    setLoading(true);
    const result = await transferHubStock(toStoreId, payload, notes);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    const storeName =
      result.storeName || retailStores.find((s) => s.id === toStoreId)?.name || "le magasin";
    setSuccess(
      `Envoyé vers ${storeName} — en attente de réception par le magasin (${payload.length} produit${payload.length > 1 ? "s" : ""})`
    );
    resetTransfer();
    router.refresh();
  }

  const canTransfer = assignedManagers.length > 0 && retailStores.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Entrepôt hub</h1>
        <p className="mt-1 text-muted">
          {hubStore.name} — {hubStore.city}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
        <Card>
          <p className="text-sm text-muted">Gérants affectés</p>
          <p className="mt-1 text-3xl font-bold">{assignedManagers.length}</p>
        </Card>
      </div>

      {!canTransfer && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm">
            Aucun gérant affecté ou aucun magasin retail disponible. Le directeur doit vous
            affecter des gérants depuis <strong>Comptes hub</strong> avant d&apos;envoyer du stock.
          </p>
        </Card>
      )}

      <Card padding={false}>
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Envoyer du stock à un magasin</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <StoreSelect
              stores={retailStores}
              value={toStoreId}
              onChange={setToStoreId}
              label="Magasin destination"
              required={false}
            />
            <Input
              label="Note (optionnel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Réapprovisionnement…"
            />
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                loading={loading}
                disabled={!canTransfer}
                onClick={() => void handleTransfer()}
              >
                <Warehouse className="h-4 w-4" />
                Transférer {transferCount > 0 ? `(${transferCount})` : ""}
              </Button>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          {success && <p className="mt-3 text-sm text-success">{success}</p>}
        </div>

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
                  <th className="px-4 py-3 text-right font-medium text-muted">Qté à envoyer</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
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
      </Card>

      <HubTransfersList transfers={transfers} allowRepair />

      {assignedManagers.length > 0 && (
        <Card padding={false}>
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">Gérants affectés — {hubStore.city}</h2>
          </div>
          <ul className="divide-y divide-border">
            {assignedManagers.map((manager) => (
              <li key={manager.id} className="px-6 py-3">
                <p className="font-medium">{manager.full_name}</p>
                <p className="text-sm text-muted">{manager.email}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Factory, Plus, Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { StoreSelect } from "@/components/stores/store-select";
import {
  addFabricationProductStock,
  createFabricationProduct,
  setFabricationProductStock,
  updateFabricationProduct,
} from "@/lib/fabrication/actions";
import { INVENTORY_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { FabricationProduct, Store } from "@/lib/types";

type ProductFormState = {
  name: string;
  productCode: string;
  unit: string;
  category: string;
  description: string;
  initialStock: string;
};

const emptyForm: ProductFormState = {
  name: "",
  productCode: "",
  unit: "unité",
  category: "",
  description: "",
  initialStock: "0",
};

export function FabricationProductsManager({
  hubStores,
  products,
  defaultHubStoreId,
  canManageCatalog,
  basePath,
}: {
  hubStores: Store[];
  products: FabricationProduct[];
  defaultHubStoreId: string;
  canManageCatalog: boolean;
  basePath: "/director" | "/hub";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hubStoreId, setHubStoreId] = useState(defaultHubStoreId);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [stockModal, setStockModal] = useState<FabricationProduct | null>(null);
  const [stockValue, setStockValue] = useState("");
  const [addQty, setAddQty] = useState("");
  const [editing, setEditing] = useState<FabricationProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);

  const selectedHub = hubStores.find((s) => s.id === hubStoreId);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        (product.product_code?.toLowerCase().includes(q) ?? false) ||
        (product.category?.toLowerCase().includes(q) ?? false) ||
        product.unit.toLowerCase().includes(q)
    );
  }, [products, search]);

  const filterToken = `${hubStoreId}|${search}`;
  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(filteredProducts, INVENTORY_PAGE_SIZE, filterToken);

  const totalUnits = useMemo(
    () => products.reduce((sum, product) => sum + product.stock, 0),
    [products]
  );
  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock > 0 && product.stock < 10).length,
    [products]
  );
  const outOfStockCount = useMemo(
    () => products.filter((product) => product.stock === 0).length,
    [products]
  );

  function navigateHubStore(storeId: string) {
    setHubStoreId(storeId);
    router.push(`${basePath}/fabrication-products?hub=${storeId}`);
    router.refresh();
  }

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  }

  function openEditModal(product: FabricationProduct) {
    setEditing(product);
    setForm({
      name: product.name,
      productCode: product.product_code || "",
      unit: product.unit,
      category: product.category || "",
      description: product.description || "",
      initialStock: String(product.stock),
    });
    setError("");
    setFormOpen(true);
  }

  function openStockModal(product: FabricationProduct) {
    setStockModal(product);
    setStockValue(String(product.stock));
    setAddQty("");
    setError("");
  }

  function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      if (editing) {
        const result = await updateFabricationProduct({
          id: editing.id,
          name: form.name,
          productCode: form.productCode,
          unit: form.unit,
          category: form.category,
          description: form.description,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createFabricationProduct({
          name: form.name,
          productCode: form.productCode,
          unit: form.unit,
          category: form.category,
          description: form.description,
          hubStoreId,
          initialStock: parseInt(form.initialStock, 10) || 0,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
      }
      setFormOpen(false);
      setSuccess(editing ? "Produit mis à jour" : "Produit de fabrication créé");
      router.refresh();
    });
  }

  function handleSaveStock(mode: "set" | "add") {
    if (!stockModal) return;
    setError("");
    startTransition(async () => {
      const result =
        mode === "add"
          ? await addFabricationProductStock(
              stockModal.id,
              hubStoreId,
              parseInt(addQty, 10) || 0
            )
          : await setFabricationProductStock(
              stockModal.id,
              hubStoreId,
              parseInt(stockValue, 10) || 0
            );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStockModal(null);
      setSuccess("Stock mis à jour");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Factory className="h-7 w-7 text-primary" />
            Produits de fabrication
          </h1>
          <p className="mt-1 text-muted">
            Matières premières et composants — séparés du catalogue vente
          </p>
        </div>
        {canManageCatalog && (
          <Button type="button" onClick={openCreateModal} disabled={!hubStoreId}>
            <Plus className="h-4 w-4" />
            Nouveau produit
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Unités en stock</p>
          <p className="mt-1 text-3xl font-bold">{totalUnits}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Alertes stock faible</p>
          <p className="mt-1 text-3xl font-bold">{lowStockCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ruptures</p>
          <p className="mt-1 text-3xl font-bold">{outOfStockCount}</p>
        </Card>
      </div>

      {hubStores.length > 1 && (
        <Card>
          <CardHeader title="Dépôt" description="Stock affiché pour l'entrepôt sélectionné" />
          <StoreSelect
            stores={hubStores}
            value={hubStoreId}
            onChange={navigateHubStore}
          />
          {selectedHub && (
            <p className="mt-2 text-sm text-muted">
              {selectedHub.name} — {selectedHub.city}
            </p>
          )}
        </Card>
      )}

      {success && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</p>
      )}

      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Inventaire fabrication"
            description={
              selectedHub
                ? `${filteredProducts.length} produit(s) — ${selectedHub.name}`
                : `${filteredProducts.length} produit(s)`
            }
          />
        </div>

        <FilterTogglePanel
          toggleLabel="Rechercher"
          summary={`${filteredProducts.length} produit${filteredProducts.length !== 1 ? "s" : ""}`}
        >
          <div className="natus-filter-bar border-b border-border p-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, code, catégorie, unité…"
                className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
              />
            </div>
          </div>
        </FilterTogglePanel>

        {filteredProducts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Aucun produit de fabrication
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-primary-light/50">
                  <th className="px-6 py-3 text-left font-medium text-muted">Produit</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Code</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Catégorie</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Unité</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Stock</th>
                  <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                  <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((product) => (
                  <tr key={product.id} className="border-b border-border">
                    <td className="px-6 py-4">
                      <p className="font-medium">{product.name}</p>
                      {product.description && (
                        <p className="mt-0.5 text-xs text-muted">{product.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{product.product_code || "—"}</td>
                    <td className="px-6 py-4 text-muted">{product.category || "—"}</td>
                    <td className="px-6 py-4 text-muted">{product.unit}</td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          product.stock === 0
                            ? "danger"
                            : product.stock < 10
                              ? "warning"
                              : "success"
                        }
                      >
                        {product.stock === 0
                          ? "Rupture"
                          : product.stock < 10
                            ? "Faible"
                            : "OK"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => openStockModal(product)}
                          disabled={pending || !hubStoreId}
                        >
                          Stock
                        </Button>
                        {canManageCatalog && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(product)}
                            disabled={pending}
                          >
                            Modifier
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalItems > 0 && (
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

      {formOpen && (
        <Modal onClose={() => setFormOpen(false)} size="md">
          <h3 className="text-lg font-semibold">
            {editing ? "Modifier le produit" : "Nouveau produit de fabrication"}
          </h3>
          <form onSubmit={handleSaveProduct} className="mt-5 space-y-4">
            <Input
              label="Nom"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Code"
                value={form.productCode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, productCode: e.target.value }))
                }
              />
              <Input
                label="Unité"
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                required
              />
            </div>
            <Input
              label="Catégorie"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
            {!editing && (
              <Input
                label="Stock initial (dépôt sélectionné)"
                type="number"
                min={0}
                value={form.initialStock}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, initialStock: e.target.value }))
                }
              />
            )}
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={pending}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {stockModal && (
        <Modal onClose={() => setStockModal(null)} size="sm">
          <h3 className="text-lg font-semibold">Ajuster le stock</h3>
          <p className="mt-1 text-sm text-muted">{stockModal.name}</p>
          <div className="mt-5 space-y-4">
            <Input
              label="Stock total"
              type="number"
              min={0}
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
            />
            <Button
              type="button"
              className="w-full"
              loading={pending}
              onClick={() => handleSaveStock("set")}
            >
              Définir le stock
            </Button>
            <Input
              label="Ajouter une quantité"
              type="number"
              min={1}
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              loading={pending}
              disabled={!addQty}
              onClick={() => handleSaveStock("add")}
            >
              Ajouter au stock
            </Button>
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

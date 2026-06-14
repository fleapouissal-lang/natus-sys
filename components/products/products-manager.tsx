"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ScanBarcode,
  Search,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SelectMenu } from "@/components/ui/select-menu";
import { categoryOptions } from "@/lib/select-options";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarcodeInput } from "@/components/products/barcode-input";
import { StockEditModal } from "@/components/products/stock-edit-modal";
import { StoreStockAllocation } from "@/components/products/store-stock-allocation";
import { ProductInfoCard } from "@/components/products/product-info-card";
import { ProductImage } from "@/components/pos/product-image";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { Modal } from "@/components/ui/modal";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/actions";
import { PRODUCT_BRAND, PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product, Store } from "@/lib/types";

function ProductForm({
  product,
  stores,
  existingProducts,
  initialBarcode = "",
  onClose,
  onExistingProduct,
}: {
  product?: Product;
  stores: Store[];
  existingProducts: Product[];
  initialBarcode?: string;
  onClose: () => void;
  onExistingProduct?: (product: Product) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [barcode, setBarcode] = useState(product?.barcode || initialBarcode);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);

  const duplicateProduct = useMemo(() => {
    if (product) return null;
    const code = barcode.trim();
    if (!code) return null;
    return existingProducts.find((p) => p.barcode === code) ?? null;
  }, [barcode, existingProducts, product]);

  function handleBarcodeScan(code: string) {
    const trimmed = code.trim();
    setBarcode(trimmed);
    if (!product) {
      const found = existingProducts.find((p) => p.barcode === trimmed);
      if (found) onExistingProduct?.(found);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (duplicateProduct) {
      setError("Ce produit est déjà ajouté dans le catalogue");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("barcode", barcode.trim());

    if (!product) {
      const imageFile = formData.get("image") as File | null;
      if (!imageFile || imageFile.size === 0) {
        setError("L'image du produit est obligatoire");
        setLoading(false);
        return;
      }
    }

    const result = product
      ? await updateProduct(product.id, formData)
      : await createProduct(formData);

    if (result.error) {
      setError(result.error);
      if ("existingProduct" in result && result.existingProduct) {
        onExistingProduct?.(result.existingProduct as Product);
      }
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {product ? "Modifier le produit" : "Nouveau produit"}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <BarcodeInput
            value={barcode}
            onChange={setBarcode}
            onScan={handleBarcodeScan}
            autoFocus={!product}
            required
          />

          {duplicateProduct && (
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
              <p className="mb-3 text-sm font-medium text-warning">
                Ce produit est déjà ajouté — impossible de créer un doublon
              </p>
              <ProductInfoCard product={duplicateProduct} compact />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => onExistingProduct?.(duplicateProduct)}
              >
                Voir le produit
              </Button>
            </div>
          )}
          <Input label="Nom" name="name" defaultValue={product?.name} required />
          <Input
            label="Prix (DH)"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.price}
            required
          />
          {!product && <StoreStockAllocation stores={stores} />}
          <Select
            label="Catégorie"
            name="category"
            options={PRODUCT_CATEGORIES}
            defaultValue={product?.category || ""}
            required
          />
          <p className="text-sm text-muted">
            Marque : <span className="font-medium text-foreground">{PRODUCT_BRAND}</span>
          </p>
          <Input
            label="Description"
            name="description"
            defaultValue={product?.description || ""}
          />
          <ImageUploadInput
            label={product ? "Nouvelle image" : "Joindre une photo"}
            required={!product}
            optional={!!product}
            previewUrl={imagePreview}
            onPreviewChange={setImagePreview}
            onError={setError}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={loading} disabled={!!duplicateProduct}>
              {product ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

function ProductDetailModal({
  product,
  onClose,
  onEdit,
  onEditStock,
  canEditStockTotal,
}: {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
  onEditStock: () => void;
  canEditStockTotal: boolean;
}) {
  return (
    <Modal onClose={onClose} size="md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Détail produit</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 mb-6">
          <ProductImage product={product} size="lg" />
          <div className="text-center">
            <p className="text-xl font-semibold">{product.name}</p>
            <p className="text-sm text-muted">{PRODUCT_BRAND} · {product.category}</p>
            <p className="mt-1 font-mono text-xs text-muted">{product.barcode}</p>
            <p className="mt-2 text-lg font-bold text-primary">
              {formatCurrency(product.price)}
            </p>
          </div>
          <Badge variant={product.stock < 10 ? "warning" : "success"}>
            Stock : {product.stock}
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={onEditStock}>
            <Warehouse className="h-4 w-4" />
            {canEditStockTotal ? "Modifier le stock" : "Ajouter du stock"}
          </Button>
          <Button variant="secondary" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Modifier le produit
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
    </Modal>
  );
}

export function ProductsManager({
  products,
  stores,
  allStores,
  defaultStoreId,
  selectedStoreName,
  canEditStockTotal,
}: {
  products: Product[];
  stores: Store[];
  allStores: Store[];
  defaultStoreId: string;
  selectedStoreName?: string;
  canEditStockTotal: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formBarcode, setFormBarcode] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [scannedPreview, setScannedPreview] = useState<Product | null>(null);
  const [duplicatePreview, setDuplicatePreview] = useState<Product | null>(null);
  const [scanHint, setScanHint] = useState("");

  const modalOpen =
    showForm || !!editingProduct || (!!selectedProduct && !scannedPreview) || !!stockProduct;

  const handleSearchScan = useCallback(
    (code: string) => {
      const found = products.find((p) => p.barcode === code.trim());
      if (found) {
        setScannedPreview(found);
        setSelectedProduct(null);
        setSearch("");
        setScanHint("");
      } else {
        setScannedPreview(null);
        setSearch(code.trim());
        setScanHint(`Aucun produit pour le code ${code}`);
        setTimeout(() => setScanHint(""), 3000);
      }
    },
    [products]
  );

  const { inputRef, handleKeyDown, handleChange } = useBarcodeScanner({
    onScan: handleSearchScan,
    enabled: !modalOpen,
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      if (!q) return matchCategory;
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false);
      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    setDeleting(id);
    await deleteProduct(id);
    router.refresh();
    setDeleting(null);
  }

  function handleExistingProductFound(found: Product) {
    setDuplicatePreview(found);
    setShowForm(false);
    setScannedPreview(found);
    setSearch("");
    setScanHint("");
  }

  function handleAddWithScan() {
    setFormBarcode("");
    setDuplicatePreview(null);
    setShowForm(true);
  }

  return (
    <>
      {/* Barre recherche + scan */}
      <Card className="mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <label className="mb-1.5 block text-sm font-medium">Scanner un produit</label>
            <ScanBarcode className="absolute left-3 bottom-2.5 h-4 w-4 text-primary" />
            <input
              ref={inputRef}
              type="text"
              onKeyDown={handleKeyDown}
              onChange={handleChange}
              placeholder="Scan code-barres pour rechercher..."
              className="w-full border border-border bg-surface py-2 pl-10 pr-3 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoComplete="off"
            />
          </div>
          <div className="relative flex-1">
            <label className="mb-1.5 block text-sm font-medium">Rechercher par nom</label>
            <Search className="absolute left-3 bottom-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom du produit..."
              className="w-full border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="w-full lg:w-48">
            <SelectMenu
              label="Catégorie"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categoryOptions(PRODUCT_CATEGORIES)}
            />
          </div>
        </div>
        {scanHint && (
          <p className="mt-3 text-sm text-danger">{scanHint}</p>
        )}
        {scannedPreview && (
          <Card className="mt-4 border-primary/40 bg-primary/5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-primary">
              {duplicatePreview?.id === scannedPreview.id
                ? "Produit déjà ajouté"
                : "Produit scanné"}
            </p>
            <ProductInfoCard product={scannedPreview} />
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setStockProduct(scannedPreview);
                  setScannedPreview(null);
                }}
              >
                <Warehouse className="h-4 w-4" />
                {canEditStockTotal ? "Modifier le stock" : "Ajouter du stock"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditingProduct(scannedPreview);
                  setScannedPreview(null);
                }}
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setScannedPreview(null)}
              >
                Fermer
              </Button>
            </div>
          </Card>
        )}
        {!modalOpen && (
          <p className="mt-2 text-xs text-muted">
            Scanner actif — {filteredProducts.length} produit(s) affiché(s)
          </p>
        )}
      </Card>

      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Produits"
            description={
              selectedStoreName
                ? `${filteredProducts.length} sur ${products.length} — stock ${selectedStoreName}`
                : `${filteredProducts.length} sur ${products.length} produit(s)`
            }
            action={
              <Button onClick={handleAddWithScan}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-primary-light/50">
                <th className="px-6 py-3 text-left font-medium text-muted">Produit</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Code-barres</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Catégorie</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Prix</th>
                <th className="px-6 py-3 text-right font-medium text-muted">
                  Stock{selectedStoreName ? ` (${selectedStoreName})` : ""}
                </th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={cn(
                    "border-b border-border cursor-pointer transition-colors hover:bg-primary/5",
                    (selectedProduct?.id === product.id || scannedPreview?.id === product.id) &&
                      "bg-primary/10"
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <ProductImage product={product} size="sm" />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted">{PRODUCT_BRAND}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{product.barcode}</td>
                  <td className="px-6 py-4">
                    {product.category && <Badge>{product.category}</Badge>}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant={product.stock < 10 ? "warning" : "success"}>
                      {product.stock}
                    </Badge>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStockProduct(product)}
                        title={canEditStockTotal ? "Modifier le stock" : "Ajouter du stock"}
                      >
                        <Warehouse className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingProduct(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        loading={deleting === product.id}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    Aucun produit trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <ProductForm
          stores={allStores}
          existingProducts={products}
          initialBarcode={formBarcode}
          onClose={() => setShowForm(false)}
          onExistingProduct={handleExistingProductFound}
        />
      )}
      {editingProduct && (
        <ProductForm
          product={editingProduct}
          stores={allStores}
          existingProducts={products}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {selectedProduct && !stockProduct && (
        <ProductDetailModal
          product={selectedProduct}
          canEditStockTotal={canEditStockTotal}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => {
            setEditingProduct(selectedProduct);
            setSelectedProduct(null);
          }}
          onEditStock={() => {
            setStockProduct(selectedProduct);
            setSelectedProduct(null);
          }}
        />
      )}
      {stockProduct && (
        <StockEditModal
          product={stockProduct}
          stores={stores}
          defaultStoreId={defaultStoreId}
          canEditTotal={canEditStockTotal}
          onClose={() => setStockProduct(null)}
        />
      )}
    </>
  );
}

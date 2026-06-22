"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarcodeInput } from "@/components/products/barcode-input";
import { StoreStockAllocation } from "@/components/products/store-stock-allocation";
import { ProductInfoCard } from "@/components/products/product-info-card";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { Modal } from "@/components/ui/modal";
import { createProductVariant } from "@/lib/actions";
import { PRODUCT_BRAND } from "@/lib/constants/products";
import { getProductCategories } from "@/lib/products/product-utils";
import type { Product, Store } from "@/lib/types";

export function VariantForm({
  parent,
  stores,
  existingProducts,
  initialBarcode = "",
  onClose,
  onExistingProduct,
}: {
  parent: Product;
  stores: Store[];
  existingProducts: Product[];
  initialBarcode?: string;
  onClose: () => void;
  onExistingProduct?: (product: Product) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [imagePreview, setImagePreview] = useState<string | null>(parent.image_url);

  const parentCategories = getProductCategories(parent);

  const duplicateProduct = useMemo(() => {
    const code = barcode.trim();
    if (!code) return null;
    return existingProducts.find((p) => p.barcode === code) ?? null;
  }, [barcode, existingProducts]);

  const handleBarcodeScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      setBarcode(trimmed);
      const found = existingProducts.find((p) => p.barcode === trimmed);
      if (found) onExistingProduct?.(found);
    },
    [existingProducts, onExistingProduct]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (duplicateProduct) {
      setError("Ce code-barres est déjà utilisé");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("barcode", barcode.trim());
    for (const category of parentCategories) {
      formData.append("categories", category);
    }

    const result = await createProductVariant(parent.id, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Nouvelle variante</h3>
        <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-4 rounded-lg bg-primary/5 px-3 py-2 text-sm">
        Parent : <span className="font-medium">{parent.name}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <BarcodeInput
          value={barcode}
          onChange={setBarcode}
          onScan={handleBarcodeScan}
          autoFocus
          required
          helperText="Code-barres unique pour cette variante"
        />

        {duplicateProduct && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
            <p className="mb-3 text-sm font-medium text-warning">
              Ce code-barres existe déjà
            </p>
            <ProductInfoCard product={duplicateProduct} compact />
          </div>
        )}

        <Input
          label="Nom de la variante"
          name="name"
          required
          placeholder="Ex. 50 ml, Rouge, Taille M…"
        />
        <Input
          label="Prix (DH)"
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
        />
        <StoreStockAllocation stores={stores} />
        <p className="text-sm text-muted">
          Catégories héritées :{" "}
          <span className="font-medium text-foreground">
            {parentCategories.join(", ") || "—"}
          </span>
        </p>
        <p className="text-sm text-muted">
          Marque : <span className="font-medium text-foreground">{PRODUCT_BRAND}</span>
        </p>
        <Input label="Description" name="description" />
        <ImageUploadInput
          label="Image de la variante (optionnel)"
          optional
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
            Créer la variante
          </Button>
        </div>
      </form>
    </Modal>
  );
}

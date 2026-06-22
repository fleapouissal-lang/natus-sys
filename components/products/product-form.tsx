"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarcodeInput } from "@/components/products/barcode-input";
import { CategoryMultiSelect } from "@/components/products/category-multi-select";
import { StoreStockAllocation } from "@/components/products/store-stock-allocation";
import { ProductInfoCard } from "@/components/products/product-info-card";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { Modal } from "@/components/ui/modal";
import { createProduct, updateProduct } from "@/lib/actions";
import { PRODUCT_BRAND } from "@/lib/constants/products";
import { getProductCategories } from "@/lib/products/product-utils";
import type { Product, ProductKind, Store } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductForm({
  product,
  stores,
  existingProducts,
  initialBarcode = "",
  canEditBarcode = false,
  onClose,
  onExistingProduct,
  onCreatedParent,
}: {
  product?: Product;
  stores: Store[];
  existingProducts: Product[];
  initialBarcode?: string;
  canEditBarcode?: boolean;
  onClose: () => void;
  onExistingProduct?: (product: Product) => void;
  onCreatedParent?: (product: Product) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [barcode, setBarcode] = useState(product?.barcode || initialBarcode);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [productKind, setProductKind] = useState<ProductKind>(
    product?.product_kind === "parent" ? "parent" : "simple"
  );
  const [categories, setCategories] = useState<string[]>(
    product ? getProductCategories(product) : []
  );

  const isEdit = !!product;
  const isParent = productKind === "parent";
  const isVariant = product?.product_kind === "variant";
  const barcodeEditable = !isParent && (!isEdit || canEditBarcode);

  const duplicateProduct = useMemo(() => {
    if (product || isParent) return null;
    const code = barcode.trim();
    if (!code) return null;
    return existingProducts.find((p) => p.barcode === code) ?? null;
  }, [barcode, existingProducts, isParent, product]);

  const handleBarcodeScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || !barcodeEditable) return;
      setBarcode(trimmed);
      if (!product) {
        const found = existingProducts.find((p) => p.barcode === trimmed);
        if (found) onExistingProduct?.(found);
      }
    },
    [barcodeEditable, existingProducts, onExistingProduct, product]
  );

  useEffect(() => {
    if (isEdit && !canEditBarcode && product?.barcode) {
      setBarcode(product.barcode);
    }
  }, [isEdit, canEditBarcode, product]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (categories.length === 0) {
      setError("Sélectionnez au moins une catégorie");
      setLoading(false);
      return;
    }

    if (duplicateProduct) {
      setError("Ce produit est déjà ajouté dans le catalogue");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("product_kind", isParent ? "parent" : "simple");

    if (!isParent) {
      formData.set(
        "barcode",
        isEdit && !canEditBarcode ? product!.barcode || "" : barcode.trim()
      );
    }

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
    if (!product && isParent && "product" in result && result.product) {
      onCreatedParent?.(result.product as Product);
    }
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {product
            ? isVariant
              ? "Modifier la variante"
              : isParent
                ? "Modifier le produit parent"
                : "Modifier le produit"
            : isParent
              ? "Nouveau produit parent"
              : "Nouveau produit"}
        </h3>
        <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
          <X className="h-5 w-5" />
        </button>
      </div>

      {isVariant && product?.parent_name && (
        <p className="mb-4 rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted">
          Parent : <span className="font-medium text-foreground">{product.parent_name}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && !isVariant && (
          <div>
            <p className="mb-2 text-sm font-medium">Type de produit</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["simple", "Produit simple"],
                  ["parent", "Produit parent (variantes)"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setProductKind(value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm cursor-pointer",
                    productKind === value
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface hover:border-primary/50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isParent && (
          <BarcodeInput
            value={barcode}
            onChange={setBarcode}
            onScan={handleBarcodeScan}
            autoFocus={barcodeEditable}
            required
            disabled={isEdit && !canEditBarcode}
            replaceOnScan={isEdit && canEditBarcode}
            helperText={
              isEdit && !canEditBarcode
                ? "Modification du code-barres réservée au directeur"
                : isEdit && canEditBarcode
                  ? "Chaque scan remplace le code-barres"
                  : "Passez le code-barres devant le lecteur"
            }
          />
        )}

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

        <Input
          label={isVariant ? "Nom de la variante" : "Nom"}
          name="name"
          defaultValue={product?.name}
          required
          placeholder={isVariant ? "Ex. 50 ml, Rouge, Taille M…" : undefined}
        />

        {!isParent && (
          <Input
            label="Prix (DH)"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.price}
            required
          />
        )}

        {!product && !isParent && <StoreStockAllocation stores={stores} />}

        <CategoryMultiSelect
          value={categories}
          onChange={setCategories}
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
            {product ? "Enregistrer" : isParent ? "Créer le parent" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

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
import { Card } from "@/components/ui/card";
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
  assignableCategories,
  layout = "modal",
  onClose,
  onExistingProduct,
  onCreatedParent,
}: {
  product?: Product;
  stores: Store[];
  existingProducts: Product[];
  initialBarcode?: string;
  canEditBarcode?: boolean;
  assignableCategories?: readonly string[];
  layout?: "modal" | "page";
  onClose: () => void;
  onExistingProduct?: (product: Product) => void;
  onCreatedParent?: (product: Product) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function setImageError(message: string) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) next.image = message;
      else delete next.image;
      return next;
    });
  }

  // Rattache un message d'erreur serveur au bon champ quand c'est possible.
  function mapServerError(message: string): { field?: string; message: string } {
    const lower = message.toLowerCase();
    if (lower.includes("code produit")) return { field: "product_code", message };
    if (lower.includes("code-barres") || lower.includes("code-barre"))
      return { field: "barcode", message };
    if (lower.includes("prix")) return { field: "price", message };
    if (lower.includes("image")) return { field: "image", message };
    if (lower.includes("nom")) return { field: "name", message };
    if (lower.includes("catégorie") || lower.includes("categorie"))
      return { field: "categories", message };
    return { message };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");

    const formData = new FormData(form);
    formData.set("product_kind", isParent ? "parent" : "simple");

    if (!isParent) {
      formData.set(
        "barcode",
        isEdit && !canEditBarcode ? product!.barcode || "" : barcode.trim()
      );
    }

    // Validation côté client, champ par champ.
    const nextErrors: Record<string, string> = {};

    const name = ((formData.get("name") as string) || "").trim();
    if (!name) nextErrors.name = "Le nom du produit est obligatoire";

    if (!isParent) {
      const priceRaw = ((formData.get("price") as string) || "").trim();
      const priceNum = Number(priceRaw);
      if (!priceRaw) {
        nextErrors.price = "Le prix est obligatoire";
      } else if (!Number.isFinite(priceNum) || priceNum < 0) {
        nextErrors.price = "Saisissez un prix valide (nombre positif)";
      }

      const code = ((formData.get("barcode") as string) || "").trim();
      if (barcodeEditable && !code) {
        nextErrors.barcode = "Le code-barres est obligatoire";
      } else if (duplicateProduct) {
        nextErrors.barcode = "Ce code-barres est déjà utilisé par un autre produit";
      }
    }

    if (categories.length === 0) {
      nextErrors.categories = "Sélectionnez au moins une catégorie";
    }

    if (!product) {
      const imageFile = formData.get("image") as File | null;
      if (!imageFile || imageFile.size === 0) {
        nextErrors.image = "L'image du produit est obligatoire";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      const focusOrder = ["name", "product_code", "barcode", "price"];
      const firstField = focusOrder.find((key) => nextErrors[key]);
      if (firstField) {
        const el = form.querySelector<HTMLElement>(`[name="${firstField}"]`);
        el?.focus();
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return;
    }

    setFieldErrors({});
    setLoading(true);

    const result = product
      ? await updateProduct(product.id, formData)
      : await createProduct(formData);

    if (result.error) {
      const mapped = mapServerError(result.error);
      if (mapped.field) {
        setFieldErrors((prev) => ({ ...prev, [mapped.field as string]: mapped.message }));
      } else {
        setError(mapped.message);
      }
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

  const title = product
    ? isVariant
      ? "Modifier la variante"
      : isParent
        ? "Modifier le produit parent"
        : "Modifier le produit"
    : isParent
      ? "Nouveau produit parent"
      : "Nouveau produit";

  const showStockSection = !product && !isParent;

  const imageField = (
    <div>
      <ImageUploadInput
        label={product ? "Nouvelle image" : "Joindre une photo"}
        required={!product}
        optional={!!product}
        previewUrl={imagePreview}
        onPreviewChange={(url) => {
          setImagePreview(url);
          if (url) setImageError("");
        }}
        onError={setImageError}
      />
      {fieldErrors.image && <p className="mt-1.5 text-sm text-danger">{fieldErrors.image}</p>}
    </div>
  );

  const body = (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {layout === "modal" && (
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isVariant && product?.parent_name && (
        <p className="mb-4 rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted">
          Parent : <span className="font-medium text-foreground">{product.parent_name}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

        {/* Informations produit — grille alignée */}
        <div className="grid gap-4 sm:grid-cols-2">
          {!isParent && (
            <>
              <Input
                label="Code produit (COM)"
                name="product_code"
                defaultValue={product?.product_code || ""}
                placeholder="Ex. NAT-001"
                error={fieldErrors.product_code}
                onChange={() => clearFieldError("product_code")}
              />
              <BarcodeInput
                value={barcode}
                onChange={(v) => {
                  setBarcode(v);
                  clearFieldError("barcode");
                }}
                onScan={handleBarcodeScan}
                autoFocus={barcodeEditable}
                required
                disabled={isEdit && !canEditBarcode}
                replaceOnScan={isEdit && canEditBarcode}
                error={fieldErrors.barcode}
                helperText={
                  isEdit && !canEditBarcode
                    ? "Modification du code-barres réservée au directeur"
                    : isEdit && canEditBarcode
                      ? "Chaque scan remplace le code-barres"
                      : "Passez le code-barres devant le lecteur"
                }
              />
            </>
          )}

          <div className="sm:col-span-2">
            <Input
              label={isVariant ? "Nom de la variante" : "Nom"}
              name="name"
              defaultValue={product?.name}
              required
              placeholder={isVariant ? "Ex. 50 ml, Rouge, Taille M…" : undefined}
              error={fieldErrors.name}
              onChange={() => clearFieldError("name")}
            />
          </div>

          {!isParent && (
            <Input
              label="Prix (DH)"
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.price}
              required
              error={fieldErrors.price}
              onChange={() => clearFieldError("price")}
            />
          )}

          <div className={isParent ? "sm:col-span-2" : undefined}>
            <CategoryMultiSelect
              value={categories}
              onChange={(next) => {
                setCategories(next);
                clearFieldError("categories");
              }}
              required
              allowCreate
              categories={assignableCategories}
              createHint="Choisissez une catégorie existante ou créez-en une nouvelle si besoin."
              error={fieldErrors.categories}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              label="Description"
              name="description"
              defaultValue={product?.description || ""}
            />
          </div>

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Photo du produit
              {!product && <span className="text-danger"> *</span>}
            </p>
            {imageField}
          </div>

          <p className="text-sm text-muted sm:col-span-2">
            Marque : <span className="font-medium text-foreground">{PRODUCT_BRAND}</span>
          </p>
        </div>

        {showStockSection && (
          <div className="rounded-xl border border-border p-4 sm:p-5">
            <StoreStockAllocation stores={stores} />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading} disabled={!!duplicateProduct}>
            {product ? "Enregistrer" : isParent ? "Créer le parent" : "Créer"}
          </Button>
        </div>
      </form>
    </>
  );

  if (layout === "page") {
    return <Card className="w-full">{body}</Card>;
  }

  return (
    <Modal onClose={onClose} size="lg">
      {body}
    </Modal>
  );
}

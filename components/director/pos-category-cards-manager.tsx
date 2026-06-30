"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LayoutGrid, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createPosCategoryCard,
  deletePosCategoryCard,
  removePosCategoryCardImage,
  updatePosCategoryCardImage,
} from "@/lib/pos/pos-category-cards/actions";
import { POS_MIN_CATEGORY_PRODUCTS, type PosCategoryCardConfig } from "@/lib/pos/pos-category-cards/types";
import { UNCATEGORIZED_PRODUCT_CATEGORY } from "@/lib/constants/products";
import { getProductCategoryIcon } from "@/lib/products/category-icons";

function CategoryPreview({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  const Icon = getProductCategoryIcon(name);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-champagne/50 to-page">
      <Icon className="h-10 w-10 text-primary/70" />
    </div>
  );
}

function isPersistedCategoryId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

function PosStatusBadge({
  productCount,
}: {
  productCount: number;
}) {
  const visible = productCount >= POS_MIN_CATEGORY_PRODUCTS;

  return (
    <Badge variant={visible ? "success" : "warning"}>
      {visible
        ? `Visible caisse · ${productCount} produit${productCount > 1 ? "s" : ""}`
        : "Masquée caisse · aucun produit"}
    </Badge>
  );
}

export function PosCategoryCardsManager({
  categories,
  productCounts,
}: {
  categories: PosCategoryCardConfig[];
  productCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", newName);
      if (newImage) formData.set("image", newImage);

      const result = await createPosCategoryCard(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      setNewName("");
      setNewImage(null);
      router.refresh();
    });
  }

  function handleImageChange(categoryId: string, file: File | null) {
    if (!file) return;
    setError("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", categoryId);
      formData.set("image", file);

      const result = await updatePosCategoryCardImage(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleRemoveImage(categoryId: string) {
    setError("");
    startTransition(async () => {
      const result = await removePosCategoryCardImage(categoryId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDeleteCategory(category: PosCategoryCardConfig, productCount: number) {
    if (category.name === UNCATEGORIZED_PRODUCT_CATEGORY) {
      setError("Impossible de supprimer la catégorie par défaut.");
      return;
    }

    const message =
      productCount > 0
        ? `Supprimer la catégorie « ${category.name} » ?\n\n${productCount} produit${productCount > 1 ? "s" : ""} ser${productCount > 1 ? "ont" : "a"} reclasse${productCount > 1 ? "s" : ""} dans « ${UNCATEGORIZED_PRODUCT_CATEGORY} ».`
        : `Supprimer la catégorie « ${category.name} » ?`;

    if (!window.confirm(message)) return;

    setError("");
    startTransition(async () => {
      const result = await deletePosCategoryCard(category.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Catégorie vide (optionnel)"
          description="Créez une catégorie avant d'y affecter des produits, ou laissez les catégories se créer automatiquement lors de l'ajout de produits."
        />
        <form onSubmit={handleCreate} className="space-y-4 px-4 pb-4 md:px-6 md:pb-6">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Input
              label="Nom de catégorie"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex. Parfum"
              required
            />
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Image</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/25 bg-page px-4 py-3 text-sm text-muted transition-colors hover:border-primary/45 hover:bg-surface">
                <ImagePlus className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">
                  {newImage ? newImage.name : "Choisir une image (JPG, PNG, WebP)"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => setNewImage(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <Button type="submit" loading={pending}>
              Ajouter
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const productCount = productCounts[category.name] ?? 0;
          const persisted = isPersistedCategoryId(category.id);

          return (
            <Card key={category.id} padding={false} className="overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden border-b border-border">
                <CategoryPreview name={category.name} imageUrl={category.imageUrl} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
                  <h3 className="font-heading text-xl text-white">{category.name}</h3>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <PosStatusBadge productCount={productCount} />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputsRef.current[category.id]?.click()}
                    loading={pending}
                    disabled={!persisted}
                    title={
                      persisted
                        ? undefined
                        : "Synchronisez les catégories en base avant de modifier l'image"
                    }
                  >
                    <Upload className="h-4 w-4" />
                    Changer l&apos;image
                  </Button>
                  {category.imageUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveImage(category.id)}
                      disabled={pending}
                    >
                      Retirer l&apos;image
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteCategory(category, productCount)}
                    disabled={pending || category.name === UNCATEGORIZED_PRODUCT_CATEGORY}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                </div>

                <input
                  ref={(node) => {
                    fileInputsRef.current[category.id] = node;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    handleImageChange(category.id, e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {categories.length === 0 && (
        <Card className="py-12 text-center text-muted">
          <LayoutGrid className="mx-auto mb-3 h-8 w-8 text-primary/60" />
          Aucune catégorie configurée.
        </Card>
      )}
    </div>
  );
}

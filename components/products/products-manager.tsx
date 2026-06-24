"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  ScanBarcode,
  Search,
  Warehouse,
  GitBranchPlus,
  Eye,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { SelectMenu } from "@/components/ui/select-menu";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "@/components/products/product-form";
import { VariantForm } from "@/components/products/variant-form";
import { StockEditModal } from "@/components/products/stock-edit-modal";
import { ProductInfoCard } from "@/components/products/product-info-card";
import { ProductImage } from "@/components/pos/product-image";
import { ProductKindBadgeForProduct } from "@/components/products/product-kind-badge";
import { ProductViewModal, PRODUCT_VIEW_ACTION_COLOR } from "@/components/products/product-view-modal";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { deleteProduct } from "@/lib/actions";
import { PRODUCT_BRAND, PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { categoryOptions } from "@/lib/select-options";
import { formatCurrency } from "@/lib/utils";
import {
  ensureParentsForVariants,
  getProductCategories,
  getTopLevelProducts,
  productDisplayName,
  productHasCategory,
} from "@/lib/products/product-utils";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product, Store } from "@/lib/types";

function ParentVariantsToggle({
  expanded,
  variantCount,
  onToggle,
  compact = false,
}: {
  expanded: boolean;
  variantCount: number;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={expanded ? "Masquer les variantes" : "Afficher les variantes"}
      aria-expanded={expanded}
      aria-label={
        expanded
          ? `Masquer ${variantCount} variante${variantCount !== 1 ? "s" : ""}`
          : `Afficher ${variantCount} variante${variantCount !== 1 ? "s" : ""}`
      }
      className={cn(
        "group shrink-0 items-center justify-center rounded-full border transition-all duration-300",
        compact ? "inline-flex h-6 w-6" : "flex h-9 w-9",
        "border-[#B38C4A]/35 bg-gradient-to-br from-[#F7F0E4] to-[#EDE4D4]",
        "hover:border-[#B38C4A]/70 hover:shadow-[0_2px_12px_rgba(179,140,74,0.22)]",
        expanded && "border-[#B38C4A]/60 shadow-[0_2px_10px_rgba(179,140,74,0.18)]"
      )}
    >
      <ChevronDown
        className={cn(
          "text-[#8B6914] transition-transform duration-300 ease-out",
          compact ? "h-3.5 w-3.5" : "h-4 w-4",
          expanded ? "rotate-0" : "-rotate-90"
        )}
      />
    </button>
  );
}

function ProductActionsCell({
  product,
  canEditStockTotal,
  deleting,
  onView,
  onAddVariant,
  onEditStock,
  onEdit,
  onDelete,
}: {
  product: Product;
  canEditStockTotal: boolean;
  deleting: string | null;
  onView: () => void;
  onAddVariant: () => void;
  onEditStock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onView}
          title="Voir le produit"
          aria-label="Voir le produit"
          className="flex h-8 w-8 shrink-0 items-center justify-center !p-0 border bg-transparent hover:bg-[#B38C4A]/10"
          style={{
            borderColor: PRODUCT_VIEW_ACTION_COLOR,
            color: PRODUCT_VIEW_ACTION_COLOR,
          }}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {product.product_kind === "parent" && (
          <Button
            variant="ghost"
            size="sm"
            title="Ajouter une variante"
            onClick={onAddVariant}
          >
            <GitBranchPlus className="h-4 w-4" />
          </Button>
        )}
        {product.product_kind !== "parent" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditStock}
            title={canEditStockTotal ? "Modifier le stock" : "Ajouter du stock"}
          >
            <Warehouse className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} loading={deleting === product.id}>
          <Trash2 className="h-4 w-4 text-danger" />
        </Button>
      </div>
    </td>
  );
}

function ProductDetailModal({
  product,
  parent,
  variants,
  onClose,
  onEdit,
  onEditStock,
  onAddVariant,
  canEditStockTotal,
}: {
  product: Product;
  parent?: Product | null;
  variants: Product[];
  onClose: () => void;
  onEdit: () => void;
  onEditStock: () => void;
  onAddVariant: () => void;
  canEditStockTotal: boolean;
}) {
  return (
    <ProductViewModal
      product={product}
      parent={parent}
      variants={variants}
      onClose={onClose}
      footer={
        <>
          {product.product_kind === "parent" && (
            <Button onClick={onAddVariant}>
              <GitBranchPlus className="h-4 w-4" />
              Ajouter une variante
            </Button>
          )}
          {product.product_kind !== "parent" && (
            <Button onClick={onEditStock}>
              <Warehouse className="h-4 w-4" />
              {canEditStockTotal ? "Modifier le stock" : "Ajouter du stock"}
            </Button>
          )}
          <Button variant="secondary" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        </>
      }
    />
  );
}

export function ProductsManager({
  products,
  stores,
  allStores,
  defaultStoreId,
  selectedStoreName,
  canEditStockTotal,
  canEditBarcode = false,
}: {
  products: Product[];
  stores: Store[];
  allStores: Store[];
  defaultStoreId: string;
  selectedStoreName?: string;
  canEditStockTotal: boolean;
  canEditBarcode?: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formBarcode, setFormBarcode] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [variantParent, setVariantParent] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scanQuery, setScanQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [scannedPreview, setScannedPreview] = useState<Product | null>(null);
  const [duplicatePreview, setDuplicatePreview] = useState<Product | null>(null);
  const [scanHint, setScanHint] = useState("");
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => new Set());

  const parentById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      if (product.product_kind === "parent") {
        map.set(product.id, product);
      }
    }
    return map;
  }, [products]);

  const variantsByParent = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      if (product.product_kind !== "variant" || !product.parent_id) continue;
      const list = map.get(product.parent_id) ?? [];
      list.push(product);
      map.set(product.parent_id, list);
    }
    return map;
  }, [products]);

  const modalOpen =
    showForm ||
    !!editingProduct ||
    !!variantParent ||
    (!!selectedProduct && !scannedPreview) ||
    !!stockProduct;

  const handleSearchScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      setScanQuery(trimmed);
      const found = products.find((p) => p.barcode === trimmed);
      if (found) {
        setScannedPreview(found);
        setSelectedProduct(null);
        setScanHint(
          found.product_kind === "parent"
            ? "Produit parent — scannez une variante pour la vente"
            : ""
        );
        setScanQuery("");
      } else {
        setScannedPreview(null);
        setScanHint(`Aucun produit pour le code ${trimmed}`);
        setTimeout(() => {
          setScanHint("");
          setScanQuery("");
        }, 3000);
      }
    },
    [products]
  );

  const { inputRef, handleKeyDown, handleChange, focusInput } = useBarcodeScanner({
    onScan: handleSearchScan,
    enabled: !modalOpen,
    autoRefocus: true,
  });

  const scannerActive = !modalOpen;

  const handleScanChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e);
      setScanQuery(e.target.value);
    },
    [handleChange]
  );

  useEffect(() => {
    if (!modalOpen) {
      setScanQuery("");
      focusInput();
    }
  }, [modalOpen, focusInput]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = products.filter((p) => {
      const matchCategory = !categoryFilter || productHasCategory(p, categoryFilter);
      if (!q) return matchCategory;
      const parent = p.parent_id ? parentById.get(p.parent_id) : null;
      const displayName = productDisplayName(p, parent).toLowerCase();
      const matchSearch =
        displayName.includes(q) ||
        (p.barcode?.includes(q) ?? false) ||
        getProductCategories(p).some((c) => c.toLowerCase().includes(q));
      return matchSearch && matchCategory;
    });
    return ensureParentsForVariants(matched, parentById);
  }, [products, search, categoryFilter, parentById]);

  const topLevelProducts = useMemo(
    () => getTopLevelProducts(filteredProducts),
    [filteredProducts]
  );

  function toggleParentExpanded(parentId: string) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  useEffect(() => {
    if (!search.trim()) return;
    const q = search.trim().toLowerCase();
    const toExpand = new Set<string>();
    for (const [parentId, variants] of variantsByParent) {
      const parent = parentById.get(parentId);
      const parentVisible = filteredProducts.some((p) => p.id === parentId);
      if (!parentVisible) continue;
      const variantMatches = variants.some((v) => {
        const name = productDisplayName(v, parent).toLowerCase();
        return (
          name.includes(q) ||
          (v.barcode?.includes(q) ?? false) ||
          getProductCategories(v).some((c) => c.toLowerCase().includes(q))
        );
      });
      if (variantMatches) toExpand.add(parentId);
    }
    if (toExpand.size === 0) return;
    setExpandedParents((prev) => new Set([...prev, ...toExpand]));
  }, [search, variantsByParent, parentById, filteredProducts]);

  const productsFilterToken = `${search}|${categoryFilter}`;
  const {
    paginated: paginatedProducts,
    page: productsPage,
    setPage: setProductsPage,
    totalPages: productsTotalPages,
    rangeStart: productsRangeStart,
    rangeEnd: productsRangeEnd,
    totalItems: productsTotalItems,
  } = usePagination(topLevelProducts, DEFAULT_PAGE_SIZE, productsFilterToken);

  function renderProductRow(
    product: Product,
    options?: { isVariant?: boolean; isLastVariant?: boolean }
  ) {
    const parent = resolveParent(product);
    const isVariantRow = options?.isVariant ?? product.product_kind === "variant";
    const isParentRow = product.product_kind === "parent";
    const childVariants = variantsByParent.get(product.id) ?? [];
    const variantCount = childVariants.length;
    const isExpanded = expandedParents.has(product.id);
    const displayName = isVariantRow
      ? product.name
      : productDisplayName(product, parent);
    const categories = getProductCategories(product);

    return (
      <tr
        key={product.id}
        onClick={() => setSelectedProduct(product)}
        className={cn(
          "border-b border-border cursor-pointer transition-colors hover:bg-primary/5",
          (selectedProduct?.id === product.id || scannedPreview?.id === product.id) &&
            "bg-primary/10",
          isParentRow &&
            "bg-gradient-to-r from-[#FAF6EF]/80 via-surface to-surface border-l-[3px] border-l-[#B38C4A]/50",
          isVariantRow &&
            "bg-gradient-to-r from-[#F7F0E4]/45 via-surface/95 to-surface hover:from-[#F7F0E4]/65"
        )}
      >
        <td className={cn("px-6 py-4", isVariantRow && "pl-4")}>
          <div className={cn("flex items-center gap-3", isVariantRow && "pl-4")}>
            {isVariantRow && (
              <span
                className={cn(
                  "relative ml-1 flex h-8 w-4 shrink-0 items-center justify-center",
                  "before:absolute before:left-1/2 before:top-0 before:h-full before:w-px before:-translate-x-1/2 before:bg-[#B38C4A]/25",
                  options?.isLastVariant ? "before:h-1/2" : ""
                )}
                aria-hidden
              >
                <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-y-1/2 bg-[#B38C4A]/35" />
                <span className="relative z-[1] h-1.5 w-1.5 rounded-full bg-[#B38C4A]/60 ring-2 ring-[#F7F0E4]" />
              </span>
            )}
            <ProductImage product={product} parent={parent} size="sm" />
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {isParentRow && variantCount > 0 && (
                  <ParentVariantsToggle
                    compact
                    expanded={isExpanded}
                    variantCount={variantCount}
                    onToggle={() => toggleParentExpanded(product.id)}
                  />
                )}
                <span className="truncate">{displayName}</span>
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-xs text-muted">{PRODUCT_BRAND}</p>
                {isParentRow && variantCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#8B6914]">
                    <Layers className="h-3 w-3" />
                    {variantCount} variante{variantCount !== 1 ? "s" : ""}
                  </span>
                )}
                {isVariantRow && parent && (
                  <span className="text-[10px] text-[#B38C4A]/80">{parent.name}</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <ProductKindBadgeForProduct product={product} />
        </td>
        <td className="px-6 py-4 font-mono text-xs">{product.barcode || "—"}</td>
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => (
              <Badge key={category}>{category}</Badge>
            ))}
          </div>
        </td>
        <td className="px-6 py-4 text-right font-medium">
          {isParentRow ? "—" : formatCurrency(product.price)}
        </td>
        <td className="px-6 py-4 text-right">
          {isParentRow ? (
            variantCount > 0 ? (
              <span className="text-xs font-medium text-[#8B6914]">
                {childVariants.reduce((sum, v) => sum + v.stock, 0)} u. total
              </span>
            ) : (
              <span className="text-muted">—</span>
            )
          ) : (
            <Badge variant={product.stock < 10 ? "warning" : "success"}>
              {product.stock}
            </Badge>
          )}
        </td>
        <ProductActionsCell
          product={product}
          canEditStockTotal={canEditStockTotal}
          deleting={deleting}
          onView={() => setSelectedProduct(product)}
          onAddVariant={() => setVariantParent(product)}
          onEditStock={() => setStockProduct(product)}
          onEdit={() => setEditingProduct(product)}
          onDelete={() => handleDelete(product.id)}
        />
      </tr>
    );
  }

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
    setVariantParent(null);
    setScannedPreview(found);
    setScanQuery("");
    setScanHint("");
  }

  function resolveParent(product: Product) {
    return product.parent_id ? parentById.get(product.parent_id) ?? null : null;
  }

  return (
    <>
      <FilterTogglePanel toggleLabel="Scanner un produit" summary="Recherche & scan">
      <Card className="natus-filter-bar mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">Scanner un produit</label>
            <div
              role="button"
              tabIndex={-1}
              onClick={() => focusInput()}
              className={cn(
                "flex cursor-text items-center gap-2 rounded-full border bg-page px-4 py-2",
                scannerActive ? "border-primary" : "border-border"
              )}
            >
              <ScanBarcode
                className={cn(
                  "h-4 w-4 shrink-0",
                  scannerActive ? "text-primary" : "text-muted"
                )}
              />
              <input
                ref={inputRef}
                type="text"
                value={scanQuery ?? ""}
                onKeyDown={handleKeyDown}
                onChange={handleScanChange}
                onFocus={() => focusInput()}
                placeholder={
                  scannerActive
                    ? "Passez le code-barres devant le lecteur…"
                    : "Scanner indisponible"
                }
                className="natus-filter-inline-input w-full min-w-0 cursor-default border-0 bg-transparent py-0 text-sm font-mono outline-none placeholder:text-muted"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">Rechercher par nom</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const val = search.trim();
                  if (!val) return;
                  if (products.some((p) => p.barcode === val)) {
                    e.preventDefault();
                    handleSearchScan(val);
                    setSearch("");
                  }
                }}
                placeholder="Nom du produit..."
                className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
                autoComplete="off"
                data-field="product-name-search"
              />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <SelectMenu
              label="Catégorie"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categoryOptions(PRODUCT_CATEGORIES)}
              size="sm"
            />
          </div>
        </div>
        {scanHint && (
          <p
            className={cn(
              "mt-3 text-sm",
              scannedPreview?.product_kind === "parent" ? "text-warning" : "text-danger"
            )}
          >
            {scanHint}
          </p>
        )}
        {scannedPreview && (
          <Card className="mt-4 border-primary/40 bg-primary/5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-primary">
              {duplicatePreview?.id === scannedPreview.id
                ? "Produit déjà ajouté"
                : "Produit scanné"}
            </p>
            <ProductInfoCard
              product={scannedPreview}
              parent={resolveParent(scannedPreview)}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {scannedPreview.product_kind === "parent" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setVariantParent(scannedPreview);
                    setScannedPreview(null);
                  }}
                >
                  <GitBranchPlus className="h-4 w-4" />
                  Ajouter une variante
                </Button>
              ) : (
                <>
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
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setScannedPreview(null);
                  setScanHint("");
                }}
              >
                Fermer
              </Button>
            </div>
          </Card>
        )}
        {!modalOpen && (
          <p className="mt-2 text-xs text-muted">
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? "s" : ""} affiché
            {filteredProducts.length !== 1 ? "s" : ""}
          </p>
        )}
      </Card>
      </FilterTogglePanel>

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
              <Button
                onClick={() => {
                  setFormBarcode("");
                  setDuplicatePreview(null);
                  setShowForm(true);
                }}
              >
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
                <th className="px-6 py-3 text-left font-medium text-muted">Type</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Code-barres</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Catégories</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Prix</th>
                <th className="px-6 py-3 text-right font-medium text-muted">
                  Stock{selectedStoreName ? ` (${selectedStoreName})` : ""}
                </th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.flatMap((product) => {
                const rows = [renderProductRow(product)];

                if (
                  product.product_kind === "parent" &&
                  expandedParents.has(product.id)
                ) {
                  const filteredIds = new Set(filteredProducts.map((p) => p.id));
                  const variants = (variantsByParent.get(product.id) ?? [])
                    .filter((v) => filteredIds.has(v.id))
                    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

                  variants.forEach((variant, index) => {
                    rows.push(
                      renderProductRow(variant, {
                        isVariant: true,
                        isLastVariant: index === variants.length - 1,
                      })
                    );
                  });
                }

                return rows;
              })}
              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    Aucun produit trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredProducts.length > 0 && (
          <PaginationBar
            page={productsPage}
            totalPages={productsTotalPages}
            rangeStart={productsRangeStart}
            rangeEnd={productsRangeEnd}
            totalItems={productsTotalItems}
            onPageChange={setProductsPage}
          />
        )}
      </Card>

      {showForm && (
        <ProductForm
          stores={allStores}
          existingProducts={products}
          initialBarcode={formBarcode}
          canEditBarcode={canEditBarcode}
          onClose={() => setShowForm(false)}
          onExistingProduct={handleExistingProductFound}
          onCreatedParent={(parent) => {
            setVariantParent(parent);
            router.refresh();
          }}
        />
      )}
      {editingProduct && (
        <ProductForm
          product={editingProduct}
          stores={allStores}
          existingProducts={products}
          canEditBarcode={canEditBarcode}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {variantParent && (
        <VariantForm
          parent={variantParent}
          stores={allStores}
          existingProducts={products}
          onClose={() => setVariantParent(null)}
          onExistingProduct={handleExistingProductFound}
        />
      )}
      {selectedProduct && !stockProduct && (
        <ProductDetailModal
          product={selectedProduct}
          parent={resolveParent(selectedProduct)}
          variants={variantsByParent.get(selectedProduct.id) ?? []}
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
          onAddVariant={() => {
            setVariantParent(selectedProduct);
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

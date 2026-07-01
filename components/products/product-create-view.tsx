"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import type { Product, Store } from "@/lib/types";

export function ProductCreateView({
  stores,
  existingProducts,
  storeId,
  canEditBarcode,
  assignableCategories,
}: {
  stores: Store[];
  existingProducts: Product[];
  storeId: string;
  canEditBarcode?: boolean;
  assignableCategories?: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.replace(/\/products\/new\/?$/, "");
  const listHref = storeId
    ? `${basePath}/products?store=${storeId}`
    : `${basePath}/products`;

  function goToList() {
    router.push(listHref);
  }

  return (
    <div className="animate-fade-in space-y-4">
      <Link
        href={listHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux produits
      </Link>

      <ProductForm
        layout="page"
        stores={stores}
        existingProducts={existingProducts}
        canEditBarcode={canEditBarcode}
        assignableCategories={assignableCategories}
        onClose={goToList}
        onExistingProduct={goToList}
      />
    </div>
  );
}

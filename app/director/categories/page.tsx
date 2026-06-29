import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PosCategoryCardsManager } from "@/components/director/pos-category-cards-manager";
import {
  getGlobalProductCountsByCategory,
  listPosCategoryCards,
} from "@/lib/pos/pos-category-cards/queries";
import { syncPosCategoryCardsFromProducts } from "@/lib/products/assignable-categories";
import { POS_MIN_CATEGORY_PRODUCTS } from "@/lib/pos/pos-category-cards/types";

export default async function DirectorCategoriesPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const supabase = await createClient();
  await syncPosCategoryCardsFromProducts(supabase);

  const [categories, productCounts] = await Promise.all([
    listPosCategoryCards(),
    getGlobalProductCountsByCategory(),
  ]);

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catégories des produits</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Les catégories sont créées automatiquement à partir des produits en base. Ajoutez une
          image pour chaque carte affichée à la caisse (visible dès{" "}
          {POS_MIN_CATEGORY_PRODUCTS} produit). Vous pouvez aussi créer une catégorie vide avant
          d&apos;ajouter des produits. La suppression reclasse les produits dans « Produits sans
          catégorie ».
        </p>
      </div>

      <PosCategoryCardsManager categories={categories} productCounts={productCounts} />
    </div>
  );
}

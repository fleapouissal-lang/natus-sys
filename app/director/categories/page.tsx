import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { PosCategoryCardsManager } from "@/components/director/pos-category-cards-manager";
import {
  getGlobalProductCountsByCategory,
  listPosCategoryCards,
} from "@/lib/pos/pos-category-cards/queries";
import { POS_MIN_CATEGORY_PRODUCTS } from "@/lib/pos/pos-category-cards/types";

export default async function DirectorCategoriesPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const [categories, productCounts] = await Promise.all([
    listPosCategoryCards(),
    getGlobalProductCountsByCategory(),
  ]);

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catégories caisse</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Gérez les images des cartes catégories affichées à la caisse. Une catégorie apparaît dès
          qu&apos;elle contient au moins {POS_MIN_CATEGORY_PRODUCTS} produit. La suppression efface
          aussi tous les produits de cette catégorie (sauf s&apos;ils ont déjà été vendus).
        </p>
      </div>

      <PosCategoryCardsManager categories={categories} productCounts={productCounts} />
    </div>
  );
}

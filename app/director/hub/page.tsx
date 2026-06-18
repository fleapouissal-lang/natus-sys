import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { getActiveStores, getProductsWithTotalStock } from "@/lib/inventory";
import { GlobalStockOverview } from "@/components/hub/global-stock-overview";

export default async function DirectorHubPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const [allStores, productsWithTotalStock] = await Promise.all([
    getActiveStores(),
    getProductsWithTotalStock(),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hub stock</h1>
        <p className="mt-1 text-muted">
          Stock total de tous les produits dans tous les magasins
        </p>
      </div>

      <GlobalStockOverview
        products={productsWithTotalStock}
        storeCount={allStores.length}
      />
    </div>
  );
}

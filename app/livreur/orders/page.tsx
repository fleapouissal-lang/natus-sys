import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";
import { getProductCatalog } from "@/lib/inventory";

export default async function LivreurOrdersPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "livreur") redirect("/login");

  if (!profile.city) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Mes livraisons</h1>
        <p className="text-muted">Aucune ville assignée à votre compte livreur.</p>
      </div>
    );
  }

  const orders = await getShopifyOrders(profile);
  const products = await getProductCatalog();
  const scopeLabel = getOrdersScopeLabel(profile, { city: profile.city });

  return (
    <div className="animate-fade-in space-y-4 md:space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-surface p-4 md:border-0 md:bg-transparent md:p-0">
        <h1 className="font-heading text-xl font-bold tracking-tight text-primary md:text-2xl">
          Mes livraisons
        </h1>
        <p className="mt-1 text-sm text-muted">
          Marquez livré ou retour (note obligatoire).{" "}
          <a
            href="/livreur/returns"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Mes retours
          </a>
          <span className="mt-1 block text-xs md:inline md:mt-0">
            {" "}
            — zone dépôt {profile.city} (magasins rattachés, toutes villes)
          </span>
        </p>
      </div>

      <ShopifyOrdersManager
        orders={orders}
        scopeLabel={scopeLabel}
        showStore
        editable
        products={products}
        livreurMode
        livreurProfileId={profile.id}
        defaultDateThisWeek
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubStoreByCity } from "@/lib/hub";
import { getFabricationProductsWithStock } from "@/lib/fabrication/queries";
import { FabricationProductsManager } from "@/components/fabrication/fabrication-products-manager";

export default async function HubFabricationProductsPage() {
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const hubStore = await getHubStoreByCity(profile.city);
  if (!hubStore) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Produits de fabrication</h1>
        <p className="text-muted">Aucun entrepôt configuré pour {profile.city}.</p>
      </div>
    );
  }

  const products = await getFabricationProductsWithStock(hubStore.id);

  return (
    <FabricationProductsManager
      hubStores={[hubStore]}
      products={products}
      defaultHubStoreId={hubStore.id}
      canManageCatalog={false}
      basePath="/hub"
    />
  );
}

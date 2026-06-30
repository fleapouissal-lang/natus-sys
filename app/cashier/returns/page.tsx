import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreById, getProductsWithStoreStock } from "@/lib/inventory";
import { getStoreProductWriteoffs } from "@/lib/store-writeoffs/list";
import { CashierWriteoffPanel } from "@/components/store-writeoffs/cashier-writeoff-panel";

export default async function CashierReturnsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (!profile.store_id) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Retour en stock</h1>
        <p className="text-muted">Aucun magasin assigné à votre compte.</p>
      </div>
    );
  }

  const store = await getStoreById(profile.store_id);
  const [products, writeoffs] = await Promise.all([
    getProductsWithStoreStock(profile.store_id),
    getStoreProductWriteoffs(profile, { limit: 30 }),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retour en stock</h1>
        <p className="mt-1 text-muted">
          Déclarez les produits périmés ou cassés — formulaire rapide et historique ci-dessous
          {store ? ` · ${store.name}, ${store.city}` : ""}
        </p>
      </div>

      <CashierWriteoffPanel products={products} writeoffs={writeoffs} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getActiveStores, getProductsWithStoreStock } from "@/lib/inventory";
import { resolveSelectedStoreId } from "@/lib/management-store";
import { StockManager } from "@/components/stock/stock-manager";

export default async function CashierStockPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await requireRole(["cashier"]);
  if (!profile) redirect("/login");

  // Magasins et dépôts (Hubs) actifs de la ville du caissier uniquement.
  const stores = await getActiveStores(profile.city);

  // Défaut : magasin rattaché au caissier ; sinon magasin sélectionné ; sinon premier.
  const defaultStoreId = resolveSelectedStoreId(
    stores,
    storeParam ?? profile.store_id
  );

  const products = defaultStoreId
    ? await getProductsWithStoreStock(defaultStoreId)
    : [];

  return (
    <StockManager
      stores={stores}
      products={products}
      defaultStoreId={defaultStoreId}
      canModifyStock={false}
      canEditTotal={false}
    />
  );
}

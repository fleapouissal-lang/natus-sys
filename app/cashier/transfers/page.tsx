import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreById, getProductCatalog } from "@/lib/inventory";
import { getCashierPendingTransfers } from "@/lib/hub-transfers";
import { CashierStockTransfers } from "@/components/cashier/cashier-stock-transfers";

export default async function CashierTransfersPage() {
  const profile = await requireRole(["cashier"]);
  if (!profile?.store_id) redirect("/login");

  const [store, transfers, products] = await Promise.all([
    getStoreById(profile.store_id),
    getCashierPendingTransfers(profile.store_id),
    getProductCatalog(),
  ]);

  const productsById = Object.fromEntries(products.map((p) => [p.id, p]));

  return (
    <div className="animate-fade-in">
      <CashierStockTransfers
        transfers={transfers}
        storeName={store?.name || "votre magasin"}
        productsById={productsById}
      />
    </div>
  );
}

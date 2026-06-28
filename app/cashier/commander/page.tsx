import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreById } from "@/lib/inventory";
import {
  getCashierRestockContext,
  getRestockSourceProducts,
} from "@/lib/restock/restock.server";
import { CashierRestockManager } from "@/components/stock/cashier-restock-manager";

export default async function CashierCommanderPage() {
  const profile = await requireRole(["cashier"]);
  if (!profile?.store_id) redirect("/login");

  const storeId = profile.store_id;
  const store = await getStoreById(storeId);
  const storeName = store?.name || "votre magasin";

  const context = await getCashierRestockContext(storeId, store?.city ?? null);

  const initialSourceProducts = context.defaultSourceId
    ? await getRestockSourceProducts(context.defaultSourceId)
    : [];

  return (
    <div className="animate-fade-in">
      <CashierRestockManager
        storeName={storeName}
        sources={context.sources}
        defaultSourceId={context.defaultSourceId}
        outOfStockProductIds={context.outOfStockProductIds}
        pendingCount={context.pendingProductIds.length}
        initialSourceProducts={initialSourceProducts}
      />
    </div>
  );
}

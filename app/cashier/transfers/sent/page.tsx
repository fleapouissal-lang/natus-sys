import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreById } from "@/lib/inventory";
import { getHubCityLivreurs } from "@/lib/hub";
import {
  filterCashierOutgoingInterStore,
  filterCashierOutgoingStoreToHub,
} from "@/lib/cashier-transfer-filters";
import { filterSentHubTransfers } from "@/lib/director-transfer-filters";
import {
  getCashierOutgoingStoreToHubTransfers,
} from "@/lib/hub-transfers";
import { getCashierOutgoingStoreTransfers } from "@/lib/store-transfers";
import { CashierSentOrdersTabs } from "@/components/stock/cashier-sent-orders-tabs";

export default async function CashierTransfersSentPage() {
  const profile = await requireRole(["cashier"]);
  if (!profile?.store_id) redirect("/login");

  const storeId = profile.store_id;
  const store = await getStoreById(storeId);
  const city = store?.city || profile.city;

  const [storeTransfers, hubTransfers, livreurs] = await Promise.all([
    getCashierOutgoingStoreTransfers(storeId),
    getCashierOutgoingStoreToHubTransfers(storeId),
    city ? getHubCityLivreurs(city) : Promise.resolve([]),
  ]);

  const interStoreTransfers = filterCashierOutgoingInterStore(storeTransfers, storeId);
  const storeToHubTransfers = filterSentHubTransfers(
    filterCashierOutgoingStoreToHub(hubTransfers, storeId)
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Stocks envoyés
        </h1>
        <p className="mt-1 text-sm text-muted">
          Transferts sortants depuis {store?.name || "votre magasin"} — préparation et expédition
        </p>
      </div>

      <Suspense fallback={null}>
        <CashierSentOrdersTabs
          storeId={storeId}
          interStoreTransfers={interStoreTransfers}
          storeToHubTransfers={storeToHubTransfers}
          livreurs={livreurs}
        />
      </Suspense>
    </div>
  );
}

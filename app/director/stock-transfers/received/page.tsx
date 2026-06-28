import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import {
  getAllActiveTransferSites,
  getTransferLivreurs,
} from "@/lib/transfer-sites.server";
import {
  filterDirectorReceivedHubTransfers,
  filterDirectorReceivedStoreTransfers,
} from "@/lib/director-transfer-filters";
import {
  filterHubStoreMixedTransfers,
  filterHubToHubTransfers,
  getDirectorHubStockTransfers,
} from "@/lib/hub-transfers";
import {
  filterInterStoreIncomingTransfers,
  getDirectorStoreStockTransfers,
} from "@/lib/store-transfers";
import { DirectorReceivedOrdersTabs } from "@/components/stock/director-received-orders-tabs";

export default async function DirectorStockTransfersReceivedPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const sitesAll = await getAllActiveTransferSites();
  const retailStores = sitesAll.filter((store) => store.is_active && !store.is_hub);
  const retailStoreIds = retailStores.map((store) => store.id);

  const [storeTransfers, hubTransfers, livreurs] = await Promise.all([
    getDirectorStoreStockTransfers(),
    getDirectorHubStockTransfers(),
    getTransferLivreurs([
      ...new Set(sitesAll.map((store) => store.city).filter(Boolean)),
    ] as string[]),
  ]);

  const interStoreTransfers = filterDirectorReceivedStoreTransfers(
    filterInterStoreIncomingTransfers(storeTransfers, retailStoreIds)
  );
  const hubHubTransfers = filterDirectorReceivedHubTransfers(
    filterHubToHubTransfers(hubTransfers)
  );
  const hubStoreMixedTransfers = filterDirectorReceivedHubTransfers(
    filterHubStoreMixedTransfers(hubTransfers)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Stocks reçus
        </h1>
        <p className="mt-1 text-sm text-muted">
          Transferts entrants dès la création — magasins et dépôts hub
        </p>
      </div>

      <Suspense fallback={null}>
        <DirectorReceivedOrdersTabs
          interStoreTransfers={interStoreTransfers}
          hubHubTransfers={hubHubTransfers}
          hubStoreMixedTransfers={hubStoreMixedTransfers}
          retailStoreIds={retailStoreIds}
          livreurs={livreurs}
        />
      </Suspense>
    </div>
  );
}

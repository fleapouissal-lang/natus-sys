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
  getDirectorHubStockTransfers,
} from "@/lib/hub-transfers";
import {
  getDirectorStoreStockTransfers,
} from "@/lib/store-transfers";
import { resolveReceivedTransfersScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { DirectorReceivedOrdersTabs } from "@/components/stock/director-received-orders-tabs";
import { getProductCatalog } from "@/lib/inventory";

export default async function DirectorStockTransfersReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; store?: string; from?: string; to?: string; type?: string; tab?: string; q?: string; status?: string; source?: string; dest?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const sitesAll = await getAllActiveTransferSites();
  const transferSites = sitesAll.filter((store) => store.is_active);
  const retailStores = transferSites.filter((store) => !store.is_hub);
  const filter = resolveReceivedTransfersScope(profile, retailStores, params);
  const retailStoreIds = retailStores.map((store) => store.id);

  const [storeTransfers, hubTransfers, livreurs, products] = await Promise.all([
    getDirectorStoreStockTransfers(),
    getDirectorHubStockTransfers(),
    getTransferLivreurs([
      ...new Set(sitesAll.map((store) => store.city).filter(Boolean)),
    ] as string[]),
    getProductCatalog(),
  ]);
  const productLookup = buildReceivedTransferProductLookup(products);

  const interStoreTransfers = filterDirectorReceivedStoreTransfers(storeTransfers);
  const hubHubTransfers = filterDirectorReceivedHubTransfers(
    hubTransfers.filter(
      (transfer) => transfer.from_store_is_hub && transfer.to_store_is_hub
    )
  );
  const hubStoreMixedTransfers = filterDirectorReceivedHubTransfers(
    hubTransfers.filter(
      (transfer) =>
        (transfer.from_store_is_hub && !transfer.to_store_is_hub) ||
        (!transfer.from_store_is_hub && transfer.to_store_is_hub)
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Stocks reçus
        </h1>
        <p className="mt-1 text-sm text-muted">
          Transferts clôturés (statut reçu) — magasins et dépôts hub
        </p>
      </div>

      <Suspense fallback={null}>
        <DirectorReceivedOrdersTabs
          filter={filter}
          interStoreTransfers={interStoreTransfers}
          hubHubTransfers={hubHubTransfers}
          hubStoreMixedTransfers={hubStoreMixedTransfers}
          retailStoreIds={retailStoreIds}
          transferSites={transferSites}
          livreurs={livreurs}
          productLookup={productLookup}
        />
      </Suspense>
    </div>
  );
}

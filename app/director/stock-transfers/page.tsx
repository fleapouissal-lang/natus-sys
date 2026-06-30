import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import {
  getAllActiveTransferSites,
  getProductsWithStoreStockForTransfer,
  getTransferLivreurs,
} from "@/lib/transfer-sites.server";
import {
  filterDirectorSentHubTransfers,
  filterDirectorSentStoreTransfers,
} from "@/lib/director-transfer-filters";
import {
  filterHubStoreMixedTransfers,
  filterHubToHubTransfers,
  getDirectorHubStockTransfers,
} from "@/lib/hub-transfers";
import {
  filterInterStoreOutgoingTransfers,
  getDirectorStoreStockTransfers,
} from "@/lib/store-transfers";
import { DirectorSentOrdersTabs } from "@/components/stock/director-sent-orders-tabs";
import { getProductCatalog } from "@/lib/inventory";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import type { Store } from "@/lib/types";

type SiteType = "store" | "hub";

function resolveSiteType(value?: string | null, fallback: SiteType = "store"): SiteType {
  return value === "hub" ? "hub" : value === "store" ? "store" : fallback;
}

function resolveStoreId(stores: Store[], param?: string | null, excludeId?: string): string {
  const candidates = excludeId ? stores.filter((store) => store.id !== excludeId) : stores;
  if (param && candidates.some((store) => store.id === param)) return param;
  return candidates[0]?.id || stores[0]?.id || "";
}

function resolveTransferSelection(input: {
  retailStores: Store[];
  hubStores: Store[];
  srcType: SiteType;
  destType: SiteType;
  fromParam?: string | null;
  fromHubParam?: string | null;
  toParam?: string | null;
  toHubParam?: string | null;
}) {
  const { retailStores, hubStores, srcType, destType, fromParam, fromHubParam, toParam, toHubParam } =
    input;

  const fromStoreId =
    srcType === "store" ? resolveStoreId(retailStores, fromParam) : retailStores[0]?.id || "";
  const fromHubStoreId =
    srcType === "hub" ? resolveStoreId(hubStores, fromHubParam) : hubStores[0]?.id || "";

  const sourceId = srcType === "hub" ? fromHubStoreId : fromStoreId;

  const toStoreId =
    destType === "store"
      ? resolveStoreId(retailStores, toParam, srcType === "store" ? sourceId : undefined)
      : resolveStoreId(retailStores, toParam);
  const toHubStoreId =
    destType === "hub"
      ? resolveStoreId(hubStores, toHubParam, srcType === "hub" ? sourceId : undefined)
      : resolveStoreId(hubStores, toHubParam);

  return {
    fromStoreId,
    fromHubStoreId,
    toStoreId,
    toHubStoreId,
    sourceId,
  };
}

export default async function DirectorStockTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    created?: string;
    src?: string;
    dest?: string;
    from?: string;
    fromHub?: string;
    to?: string;
    toHub?: string;
    q?: string;
    status?: string;
    source?: string;
    listDest?: string;
    sentFrom?: string;
    sentTo?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const sitesAll = await getAllActiveTransferSites();
  const transferSites = sitesAll.filter((store) => store.is_active);
  const retailStores = transferSites.filter((store) => !store.is_hub);
  const hubStores = transferSites.filter((store) => store.is_hub);
  const retailStoreIds = retailStores.map((store) => store.id);
  const filter = resolveSentTransfersListScope(profile, transferSites, params);

  const srcType = resolveSiteType(params.src, "store");
  const destType = resolveSiteType(params.dest, "store");
  const { fromStoreId, fromHubStoreId, toStoreId, toHubStoreId, sourceId } =
    resolveTransferSelection({
      retailStores,
      hubStores,
      srcType,
      destType,
      fromParam: params.from,
      fromHubParam: params.fromHub,
      toParam: params.to,
      toHubParam: params.toHub,
    });

  const [products, storeTransfers, hubTransfers, livreurs, catalogProducts] =
    await Promise.all([
      sourceId ? getProductsWithStoreStockForTransfer(sourceId) : Promise.resolve([]),
      getDirectorStoreStockTransfers(),
      getDirectorHubStockTransfers(),
      getTransferLivreurs([
        ...new Set(sitesAll.map((store) => store.city).filter(Boolean)),
      ] as string[]),
      getProductCatalog(),
    ]);
  const productLookup = buildReceivedTransferProductLookup(catalogProducts);

  const interStoreTransfers = filterDirectorSentStoreTransfers(
    filterInterStoreOutgoingTransfers(storeTransfers, retailStoreIds)
  );
  const hubHubTransfers = filterDirectorSentHubTransfers(
    filterHubToHubTransfers(hubTransfers)
  );
  const hubStoreMixedTransfers = filterDirectorSentHubTransfers(
    filterHubStoreMixedTransfers(hubTransfers)
  );

  const successMessage =
    params.created === "1"
      ? "Transfert créé avec succès — consultez l'onglet « Transferts en cours »."
      : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Stocks envoyés
        </h1>
        <p className="mt-1 text-sm text-muted">
          Création et suivi des transferts en cours — magasins et dépôts hub
        </p>
      </div>

      <Suspense fallback={null}>
        <DirectorSentOrdersTabs
          retailStores={retailStores}
          hubStores={hubStores}
          products={products}
          sourceType={srcType}
          destType={destType}
          fromStoreId={fromStoreId}
          fromHubStoreId={fromHubStoreId}
          toStoreId={toStoreId}
          toHubStoreId={toHubStoreId}
          interStoreTransfers={interStoreTransfers}
          hubHubTransfers={hubHubTransfers}
          hubStoreMixedTransfers={hubStoreMixedTransfers}
          retailStoreIds={retailStoreIds}
          transferSites={transferSites}
          livreurs={livreurs}
          filter={filter}
          productLookup={productLookup}
          successMessage={successMessage}
        />
      </Suspense>
    </div>
  );
}

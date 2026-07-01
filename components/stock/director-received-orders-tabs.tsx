"use client";

import { useMemo } from "react";
import { ReceivedTransfersFilterBar } from "@/components/stock/received-transfers-filter-bar";
import { ReceivedTransfersList } from "@/components/stock/received-transfers-list";
import { useReceivedTransferRows } from "@/components/stock/use-received-transfer-rows";
import {
  filterTransfersBySentDate,
  type ReceivedTransfersFilterScope,
} from "@/lib/stock-transfers/received-filters";
import type { ReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import type { ReceivedTransferLocationSites } from "@/lib/stock-transfers/received-location-filters";
import type { HubStockTransfer, Profile, StoreStockTransfer } from "@/lib/types";

export function DirectorReceivedOrdersTabs({
  filter,
  interStoreTransfers,
  hubHubTransfers,
  hubStoreMixedTransfers,
  retailStoreIds,
  transferSites,
  livreurs,
  productLookup,
}: {
  filter: ReceivedTransfersFilterScope;
  interStoreTransfers: StoreStockTransfer[];
  hubHubTransfers: HubStockTransfer[];
  hubStoreMixedTransfers: HubStockTransfer[];
  retailStoreIds: string[];
  transferSites: ReceivedTransferLocationSites[];
  livreurs: Profile[];
  productLookup?: ReceivedTransferProductLookup;
}) {
  const interStore = useMemo(
    () => filterTransfersBySentDate(interStoreTransfers, filter.dateFrom, filter.dateTo),
    [interStoreTransfers, filter.dateFrom, filter.dateTo]
  );
  const hubHub = useMemo(
    () => filterTransfersBySentDate(hubHubTransfers, filter.dateFrom, filter.dateTo),
    [hubHubTransfers, filter.dateFrom, filter.dateTo]
  );
  const hubMixed = useMemo(
    () => filterTransfersBySentDate(hubStoreMixedTransfers, filter.dateFrom, filter.dateTo),
    [hubStoreMixedTransfers, filter.dateFrom, filter.dateTo]
  );

  const groups = useMemo(
    () => [
      { kind: "store" as const, typeLabel: "Inter-magasins", storeTransfers: interStore },
      { kind: "hub" as const, typeLabel: "Entre Hubs", hubTransfers: hubHub },
      { kind: "mixed" as const, typeLabel: "Hub ↔ Magasin", hubTransfers: hubMixed },
    ],
    [interStore, hubHub, hubMixed]
  );

  const locationConfig = useMemo(
    () => ({
      sourceSites: transferSites,
      destinationSites: transferSites,
    }),
    [transferSites]
  );

  const { rows, sourceOptions, destinationOptions } = useReceivedTransferRows(
    groups,
    filter,
    productLookup,
    locationConfig
  );

  return (
    <div className="space-y-6">
      <ReceivedTransfersFilterBar
        filter={filter}
        resultCount={rows.length}
        sourceOptions={sourceOptions}
        destinationOptions={destinationOptions}
      />

      <ReceivedTransfersList
        rows={rows}
        managedStoreIds={retailStoreIds}
        livreurs={livreurs}
        showProductImages
        storeActionMode="none"
        documentOnView="livraison"
        emptyMessage="Aucun transfert reçu"
      />
    </div>
  );
}

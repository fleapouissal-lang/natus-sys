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
import {
  filterIncomingHubTransfersToStores,
  filterIncomingStoreTransfersToStores,
} from "@/lib/stock-transfers/role-transfer-filters";
import type { HubStockTransfer, Store, StoreStockTransfer } from "@/lib/types";

export function ManagerReceivedOrdersTabs({
  filter,
  hubTransfers,
  storeTransfers,
  storeIds,
  sourceSites,
  destinationStores,
  productLookup,
}: {
  filter: ReceivedTransfersFilterScope;
  scopeLabel: string;
  hubTransfers: HubStockTransfer[];
  storeTransfers: StoreStockTransfer[];
  storeIds: string[];
  stores: Store[];
  selectedStoreId: string;
  sourceSites: ReceivedTransferLocationSites[];
  destinationStores: ReceivedTransferLocationSites[];
  productLookup?: ReceivedTransferProductLookup;
}) {
  const hub = useMemo(
    () =>
      filterTransfersBySentDate(
        filterIncomingHubTransfersToStores(hubTransfers, storeIds),
        filter.dateFrom,
        filter.dateTo
      ),
    [hubTransfers, storeIds, filter.dateFrom, filter.dateTo]
  );
  const store = useMemo(
    () =>
      filterTransfersBySentDate(
        filterIncomingStoreTransfersToStores(storeTransfers, storeIds),
        filter.dateFrom,
        filter.dateTo
      ),
    [storeTransfers, storeIds, filter.dateFrom, filter.dateTo]
  );

  const groups = useMemo(
    () => [
      { kind: "depot" as const, typeLabel: "Dépôt hub", hubTransfers: hub },
      { kind: "store" as const, typeLabel: "Inter-magasin", storeTransfers: store },
    ],
    [hub, store]
  );

  const locationConfig = useMemo(
    () => ({
      sourceSites,
      destinationSites: destinationStores,
      strictDestinationOptions: true,
    }),
    [sourceSites, destinationStores]
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
        managedStoreIds={storeIds}
        showProductImages
        storeActionMode="none"
        hubReadOnly
        detailVariant="reception"
        emptyMessage="Aucune commande reçue"
      />
    </div>
  );
}

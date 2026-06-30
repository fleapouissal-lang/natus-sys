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
import type { HubStockTransfer, Profile } from "@/lib/types";

export function HubReceivedOrdersTabs({
  filter,
  scopeLabel,
  hubStores,
  locationSites,
  incomingToStores,
  incomingToDepot,
  livreurs,
  productLookup,
}: {
  filter: ReceivedTransfersFilterScope;
  scopeLabel: string;
  hubStores: { id: string }[];
  locationSites: ReceivedTransferLocationSites[];
  selectedHubStoreId: string;
  incomingToStores: HubStockTransfer[];
  incomingToDepot: HubStockTransfer[];
  livreurs: Profile[];
  productLookup?: ReceivedTransferProductLookup;
}) {
  const toStores = useMemo(
    () => filterTransfersBySentDate(incomingToStores, filter.dateFrom, filter.dateTo),
    [incomingToStores, filter.dateFrom, filter.dateTo]
  );
  const toDepot = useMemo(
    () => filterTransfersBySentDate(incomingToDepot, filter.dateFrom, filter.dateTo),
    [incomingToDepot, filter.dateFrom, filter.dateTo]
  );

  const groups = useMemo(
    () => [
      { kind: "store" as const, typeLabel: "Vers magasin", hubTransfers: toStores },
      { kind: "depot" as const, typeLabel: "Au dépôt", hubTransfers: toDepot },
    ],
    [toStores, toDepot]
  );

  const locationConfig = useMemo(
    () => ({
      sourceSites: locationSites,
      destinationSites: locationSites,
    }),
    [locationSites]
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
        managedStoreIds={hubStores.map((s) => s.id)}
        livreurs={livreurs}
        showProductImages
        hubReadOnly={false}
        emptyMessage={`Aucun transfert reçu pour ${scopeLabel}`}
      />
    </div>
  );
}

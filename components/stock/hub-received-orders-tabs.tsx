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
  destinationSites,
  incomingTransfers,
  livreurs,
  productLookup,
}: {
  filter: ReceivedTransfersFilterScope;
  scopeLabel: string;
  hubStores: { id: string; name?: string; city?: string }[];
  locationSites: ReceivedTransferLocationSites[];
  destinationSites: ReceivedTransferLocationSites[];
  selectedHubStoreId: string;
  incomingTransfers: HubStockTransfer[];
  livreurs: Profile[];
  productLookup?: ReceivedTransferProductLookup;
}) {
  const incoming = useMemo(
    () => filterTransfersBySentDate(incomingTransfers, filter.dateFrom, filter.dateTo),
    [incomingTransfers, filter.dateFrom, filter.dateTo]
  );

  const groups = useMemo(
    () => [{ kind: "depot" as const, typeLabel: "Réceptions dépôt", hubTransfers: incoming }],
    [incoming]
  );

  const locationConfig = useMemo(
    () => ({
      sourceSites: locationSites,
      destinationSites,
      strictDestinationOptions: true,
    }),
    [locationSites, destinationSites]
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
        title="Stocks reçus"
        rows={rows}
        managedStoreIds={hubStores.map((s) => s.id)}
        livreurs={livreurs}
        showProductImages
        hubReadOnly={false}
        documentOnView="livraison"
        emptyMessage={`Aucun transfert reçu au dépôt pour ${scopeLabel}`}
      />
    </div>
  );
}

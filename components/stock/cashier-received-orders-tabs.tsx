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
import type { HubStockTransfer, Product, StoreStockTransfer } from "@/lib/types";

export function CashierReceivedOrdersTabs({
  filter,
  storeId,
  storeName,
  storeSite,
  interStoreTransfers,
  hubToStoreTransfers,
  productsById,
  storeStockByProductId,
  productLookup,
}: {
  filter: ReceivedTransfersFilterScope;
  storeId: string;
  storeName: string;
  storeSite: ReceivedTransferLocationSites;
  interStoreTransfers: StoreStockTransfer[];
  hubToStoreTransfers: HubStockTransfer[];
  productsById: Record<string, Pick<Product, "id" | "name" | "barcode" | "image_url" | "category">>;
  storeStockByProductId: Record<string, number>;
  productLookup?: ReceivedTransferProductLookup;
}) {
  const interStore = useMemo(
    () => filterTransfersBySentDate(interStoreTransfers, filter.dateFrom, filter.dateTo),
    [interStoreTransfers, filter.dateFrom, filter.dateTo]
  );
  const hubToStore = useMemo(
    () => filterTransfersBySentDate(hubToStoreTransfers, filter.dateFrom, filter.dateTo),
    [hubToStoreTransfers, filter.dateFrom, filter.dateTo]
  );

  const groups = useMemo(
    () => [
      { kind: "store" as const, typeLabel: "Inter-magasins", storeTransfers: interStore },
      { kind: "mixed" as const, typeLabel: "Hub → Magasin", hubTransfers: hubToStore },
    ],
    [interStore, hubToStore]
  );

  const locationConfig = useMemo(
    () => ({
      sourceSites: [],
      destinationSites: [storeSite],
      lockDestination: true,
    }),
    [storeSite]
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
        lockDestination
      />

      <ReceivedTransfersList
        rows={rows}
        managedStoreIds={[storeId]}
        storeActionMode="receive-only"
        cashierHub={{
          storeName,
          productsById,
          storeStockByProductId,
        }}
        emptyMessage="Aucun transfert reçu"
      />
    </div>
  );
}

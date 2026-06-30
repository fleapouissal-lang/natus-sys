"use client";

import { useMemo } from "react";
import { ReceivedTransfersFilterBar } from "@/components/stock/received-transfers-filter-bar";
import { ReceivedTransfersList } from "@/components/stock/received-transfers-list";
import {
  useReceivedTransferRows,
  type ReceivedTransfersLocationConfig,
} from "@/components/stock/use-received-transfer-rows";
import {
  filterTransfersBySentDate,
  type ReceivedTransfersFilterScope,
} from "@/lib/stock-transfers/received-filters";
import type {
  ReceivedTransferProductLookup,
  ReceivedTransferRowGroup,
} from "@/lib/stock-transfers/received-transfer-rows";
import type { Profile } from "@/lib/types";

export function SentTransfersUnifiedView({
  filter,
  groups,
  locationConfig,
  productLookup,
  managedStoreIds,
  livreurs,
  emptyMessage = "Aucun transfert envoyé",
  storeActionMode = "none",
  hubReadOnly = true,
  hubManageAsStoreSource = false,
  showProductImages = true,
}: {
  filter: ReceivedTransfersFilterScope;
  groups: ReceivedTransferRowGroup[];
  locationConfig: ReceivedTransfersLocationConfig;
  productLookup?: ReceivedTransferProductLookup;
  managedStoreIds: string[];
  livreurs?: Profile[];
  emptyMessage?: string;
  storeActionMode?: "none" | "receive-only" | "full";
  hubReadOnly?: boolean;
  hubManageAsStoreSource?: boolean;
  showProductImages?: boolean;
}) {
  const datedGroups = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      storeTransfers: group.storeTransfers
        ? filterTransfersBySentDate(
            group.storeTransfers,
            filter.dateFrom,
            filter.dateTo
          )
        : undefined,
      hubTransfers: group.hubTransfers
        ? filterTransfersBySentDate(group.hubTransfers, filter.dateFrom, filter.dateTo)
        : undefined,
    }));
  }, [groups, filter.dateFrom, filter.dateTo]);

  const { rows, sourceOptions, destinationOptions, lockDestination, lockSource } =
    useReceivedTransferRows(datedGroups, filter, productLookup, locationConfig);

  return (
    <div className="space-y-6">
      <ReceivedTransfersFilterBar
        variant="sent"
        preserveTab="sent"
        filter={filter}
        resultCount={rows.length}
        sourceOptions={sourceOptions}
        destinationOptions={destinationOptions}
        lockDestination={lockDestination}
        lockSource={lockSource}
      />

      <ReceivedTransfersList
        title="Transferts envoyés"
        rows={rows}
        managedStoreIds={managedStoreIds}
        livreurs={livreurs}
        showProductImages={showProductImages}
        storeActionMode={storeActionMode}
        hubReadOnly={hubReadOnly}
        hubManageAsStoreSource={hubManageAsStoreSource}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

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
import {
  filterTransfersByWorkflowSplit,
  type TransferWorkflowSplit,
} from "@/lib/stock-transfers/workflow-split";
import type {
  ReceivedTransferProductLookup,
  ReceivedTransferRowGroup,
} from "@/lib/stock-transfers/received-transfer-rows";
import type { Profile } from "@/lib/types";
import type { TransferDetailVariant } from "@/components/stock/received-transfer-detail-modal";
import type {
  CommanderRole,
  MesCommandesActionMode,
} from "@/lib/stock-transfers/pending-order-actions";

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
  hubManageOutgoing = false,
  showProductImages = true,
  workflowSplit = "sent",
  listTitle = "Stock envoyé",
  mesCommandesActionMode,
  commanderRole,
  detailVariant = "order",
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
  hubManageOutgoing?: boolean;
  showProductImages?: boolean;
  workflowSplit?: TransferWorkflowSplit;
  listTitle?: string;
  mesCommandesActionMode?: MesCommandesActionMode;
  commanderRole?: CommanderRole;
  detailVariant?: TransferDetailVariant;
}) {
  const datedGroups = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      storeTransfers: group.storeTransfers
        ? filterTransfersByWorkflowSplit(
            filterTransfersBySentDate(
              group.storeTransfers,
              filter.dateFrom,
              filter.dateTo
            ),
            workflowSplit
          )
        : undefined,
      hubTransfers: group.hubTransfers
        ? filterTransfersByWorkflowSplit(
            filterTransfersBySentDate(group.hubTransfers, filter.dateFrom, filter.dateTo),
            workflowSplit
          )
        : undefined,
    }));
  }, [groups, filter.dateFrom, filter.dateTo, workflowSplit]);

  const { rows, sourceOptions, destinationOptions, lockDestination, lockSource } =
    useReceivedTransferRows(datedGroups, filter, productLookup, locationConfig);

  return (
    <div className="space-y-6">
      <ReceivedTransfersFilterBar
        variant={
          workflowSplit === "pending"
            ? "pending"
            : workflowSplit === "history"
              ? "sent"
              : "sent"
        }
        preserveTab={
          workflowSplit === "sent" || workflowSplit === "sent-source" ? "sent" : undefined
        }
        filter={filter}
        resultCount={rows.length}
        sourceOptions={sourceOptions}
        destinationOptions={destinationOptions}
        lockDestination={lockDestination}
        lockSource={lockSource}
      />

      <ReceivedTransfersList
        title={listTitle}
        rows={rows}
        managedStoreIds={managedStoreIds}
        livreurs={livreurs}
        showProductImages={showProductImages}
        storeActionMode={storeActionMode}
        hubReadOnly={hubReadOnly}
        hubManageAsStoreSource={hubManageAsStoreSource}
        hubManageOutgoing={hubManageOutgoing}
        mesCommandesActionMode={mesCommandesActionMode}
        commanderRole={commanderRole}
        detailVariant={detailVariant}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

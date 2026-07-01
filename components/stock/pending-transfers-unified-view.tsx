"use client";

import { SentTransfersUnifiedView } from "@/components/stock/sent-transfers-unified-view";
import type { TransferDetailVariant } from "@/components/stock/received-transfer-detail-modal";
import type { ReceivedTransfersLocationConfig } from "@/components/stock/use-received-transfer-rows";
import type { ReceivedTransfersFilterScope } from "@/lib/stock-transfers/received-filters";
import type {
  ReceivedTransferProductLookup,
  ReceivedTransferRowGroup,
} from "@/lib/stock-transfers/received-transfer-rows";
import type {
  CommanderRole,
  MesCommandesActionMode,
} from "@/lib/stock-transfers/pending-order-actions";
import type { Profile } from "@/lib/types";

export function PendingTransfersUnifiedView({
  emptyMessage = "Aucune commande en attente",
  mesCommandesActionMode = "view-only",
  commanderRole,
  detailVariant = "order",
  storeActionMode = "none",
  hubReadOnly = true,
  hubManageAsStoreSource = false,
  workflowSplit = "pending-attente",
  ...props
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
  mesCommandesActionMode?: MesCommandesActionMode;
  commanderRole?: CommanderRole;
  detailVariant?: TransferDetailVariant;
  workflowSplit?: import("@/lib/stock-transfers/workflow-split").TransferWorkflowSplit | "pending";
}) {
  return (
    <SentTransfersUnifiedView
      {...props}
      workflowSplit={workflowSplit}
      listTitle="Mes commandes"
      emptyMessage={emptyMessage}
      storeActionMode={storeActionMode}
      hubReadOnly={hubReadOnly}
      hubManageAsStoreSource={hubManageAsStoreSource}
      mesCommandesActionMode={mesCommandesActionMode}
      commanderRole={commanderRole}
      detailVariant={detailVariant}
    />
  );
}

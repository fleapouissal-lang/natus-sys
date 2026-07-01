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
  emptyMessage = "Aucune commande en cours de préparation",
  mesCommandesActionMode = "view-only",
  commanderRole,
  detailVariant = "order",
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
}) {
  return (
    <SentTransfersUnifiedView
      {...props}
      workflowSplit="pending"
      listTitle="Mes commandes"
      emptyMessage={emptyMessage}
      storeActionMode="none"
      hubReadOnly
      mesCommandesActionMode={mesCommandesActionMode}
      commanderRole={commanderRole}
      detailVariant={detailVariant}
    />
  );
}

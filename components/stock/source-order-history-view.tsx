"use client";

import { SentTransfersUnifiedView } from "@/components/stock/sent-transfers-unified-view";
import type { ReceivedTransfersFilterScope } from "@/lib/stock-transfers/received-filters";
import type {
  ReceivedTransferProductLookup,
  ReceivedTransferRowGroup,
} from "@/lib/stock-transfers/received-transfer-rows";
import type { ReceivedTransferLocationSites } from "@/lib/stock-transfers/received-location-filters";
import type { Profile } from "@/lib/types";

export function SourceOrderHistoryView({
  filter,
  groups,
  locationConfig,
  productLookup,
  managedStoreIds,
  livreurs,
  scopeLabel,
  description,
}: {
  filter: ReceivedTransfersFilterScope;
  groups: ReceivedTransferRowGroup[];
  locationConfig: {
    sourceSites: ReceivedTransferLocationSites[];
    destinationSites: ReceivedTransferLocationSites[];
    strictSourceOptions?: boolean;
    strictDestinationOptions?: boolean;
    lockSource?: boolean;
  };
  productLookup?: ReceivedTransferProductLookup;
  managedStoreIds: string[];
  livreurs?: Profile[];
  scopeLabel?: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {description ||
          `Journal permanent des commandes envoyées${scopeLabel ? ` — ${scopeLabel}` : ""}. Consultation seule : numéro, dates, produits, quantités, statuts et auteur. Les commandes reçues ou clôturées restent enregistrées ici.`}
      </p>
      <SentTransfersUnifiedView
        filter={filter}
        groups={groups}
        locationConfig={locationConfig}
        productLookup={productLookup}
        managedStoreIds={managedStoreIds}
        livreurs={livreurs}
        workflowSplit="history"
        listTitle="Historique des commandes"
        detailVariant="order"
        storeActionMode="none"
        hubReadOnly
        hubManageAsStoreSource
        showProductImages
        emptyMessage="Aucune commande envoyée enregistrée"
      />
    </div>
  );
}

/** @deprecated Utiliser SourceOrderHistoryView */
export const ManagerSourceTransferHistory = SourceOrderHistoryView;

"use client";

import { SentTransfersUnifiedView } from "@/components/stock/sent-transfers-unified-view";
import type { ReceivedTransfersFilterScope } from "@/lib/stock-transfers/received-filters";
import type {
  ReceivedTransferProductLookup,
  ReceivedTransferRowGroup,
} from "@/lib/stock-transfers/received-transfer-rows";
import type { ReceivedTransferLocationSites } from "@/lib/stock-transfers/received-location-filters";
import type { Profile } from "@/lib/types";

export function ManagerSourceTransferHistory({
  filter,
  groups,
  locationConfig,
  productLookup,
  managedStoreIds,
  livreurs,
  scopeLabel,
}: {
  filter: ReceivedTransfersFilterScope;
  groups: ReceivedTransferRowGroup[];
  locationConfig: {
    sourceSites: ReceivedTransferLocationSites[];
    destinationSites: ReceivedTransferLocationSites[];
    strictSourceOptions?: boolean;
    strictDestinationOptions?: boolean;
  };
  productLookup?: ReceivedTransferProductLookup;
  managedStoreIds: string[];
  livreurs?: Profile[];
  scopeLabel: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Commandes envoyées depuis vos magasins — {scopeLabel}. Consultez les produits, quantités,
        destinations, dates et statuts de chaque envoi.
      </p>
      <SentTransfersUnifiedView
        filter={filter}
        groups={groups}
        locationConfig={locationConfig}
        productLookup={productLookup}
        managedStoreIds={managedStoreIds}
        livreurs={livreurs}
        workflowSplit="history"
        listTitle="Historique des commandes envoyées"
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

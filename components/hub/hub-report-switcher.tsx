"use client";

import { useState } from "react";
import { Store as StoreIcon, Warehouse } from "lucide-react";
import { natusFilterChipClass } from "@/components/ui/natus-filter-chip";
import { HubDashboardAnalytics } from "@/components/hub/hub-dashboard-analytics";
import { DashboardAnalyticsPanel } from "@/components/dashboard/dashboard-analytics-panel";
import type { HubDashboardAnalytics as HubAnalyticsType } from "@/lib/hub/dashboard-stats";

type AssignedStore = { id: string; name: string; city: string };

export function HubReportSwitcher({
  city,
  hubStoreName,
  hubAnalytics,
  assignedStores,
}: {
  city: string;
  hubStoreName?: string;
  hubAnalytics: HubAnalyticsType;
  assignedStores: AssignedStore[];
}) {
  // "hub" = rapport du dépôt ; sinon l'id du magasin assigné sélectionné.
  const [scope, setScope] = useState<string>("hub");
  const selectedStore = assignedStores.find((store) => store.id === scope);
  const isHubScope = scope === "hub" || !selectedStore;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Rapport</h2>
        <p className="mt-1 text-sm text-muted">
          Affichez le rapport du dépôt ou d&apos;un magasin assigné
        </p>
      </div>

      <div className="natus-filter-bar overflow-visible rounded-2xl p-4 md:rounded-lg">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScope("hub")}
            className={natusFilterChipClass(isHubScope)}
          >
            <Warehouse className="h-3.5 w-3.5" />
            Dépôt{hubStoreName ? ` — ${hubStoreName}` : ""}
          </button>
          {assignedStores.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => setScope(store.id)}
              className={natusFilterChipClass(scope === store.id)}
            >
              <StoreIcon className="h-3.5 w-3.5" />
              {store.name}
            </button>
          ))}
        </div>
      </div>

      {isHubScope ? (
        <HubDashboardAnalytics stats={hubAnalytics} />
      ) : (
        <DashboardAnalyticsPanel
          storeIds={[selectedStore.id]}
          scopeLabel={`${selectedStore.name} — ${selectedStore.city}`}
          allStoreIds={assignedStores.map((store) => store.id)}
          allScopeLabel={`Magasins assignés · ${city} (${assignedStores.length})`}
          title="Rapport magasin"
        />
      )}
    </div>
  );
}

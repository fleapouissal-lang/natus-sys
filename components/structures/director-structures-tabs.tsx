"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Package,
  Plus,
  Store as StoreIcon,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoresAdminSection } from "@/components/stores/stores-admin-section";
import { HubAccountsManager } from "@/components/hub/hub-accounts-manager";
import { cn } from "@/lib/utils";
import type { Profile, Store, StoreWithStats } from "@/lib/types";

type DirectorStructuresTabsProps = {
  stores: StoreWithStats[];
  allowedCities: string[];
  defaultCity?: string;
  cityLabel?: string;
  canCreateStore: boolean;
  hubAccounts: Profile[];
  retailStores: Store[];
  assignmentsByHub: Record<string, string[]>;
};

function SummaryStat({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof StoreIcon;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const toneClasses = {
    default: "border-primary/20 bg-primary/[0.03] text-foreground",
    warning: "border-warning/30 bg-warning/5 text-warning",
    success: "border-success/30 bg-success/5 text-success",
    danger: "border-danger/30 bg-danger/5 text-danger",
  } as const;

  return (
    <div className={cn("rounded-xl border p-4 transition-colors", toneClasses[tone])}>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon className="natus-icon h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function DirectorStructuresTabs({
  stores,
  allowedCities,
  defaultCity,
  cityLabel,
  canCreateStore,
  hubAccounts,
  retailStores,
  assignmentsByHub,
}: DirectorStructuresTabsProps) {
  const [storeCreateOpen, setStoreCreateOpen] = useState(false);
  const [hubCreateOpen, setHubCreateOpen] = useState(false);

  const { depotCount, shopCount, totalUnits, totalLowStock } = useMemo(() => {
    return {
      depotCount: stores.filter((s) => s.is_hub).length,
      shopCount: stores.filter((s) => !s.is_hub).length,
      totalUnits: stores.reduce((sum, store) => sum + store.totalUnits, 0),
      totalLowStock: stores.reduce((sum, store) => sum + store.lowStockCount, 0),
    };
  }, [stores]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <div className="flex flex-col gap-5 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/5 text-primary">
              <StoreIcon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Magasins &amp; Dépôts</h1>
              <p className="mt-1 text-sm text-muted">
                {cityLabel
                  ? `Créer et gérer les magasins et dépôts — ${cityLabel}`
                  : "Créer et gérer vos magasins et comptes dépôt"}
              </p>
            </div>
          </div>

          {canCreateStore && (
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button
                type="button"
                variant="primary"
                onClick={() => setStoreCreateOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
                Ajouter un magasin
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setHubCreateOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="natus-icon h-4 w-4" strokeWidth={2} aria-hidden />
                Nouveau compte dépôt
              </Button>
            </div>
          )}
        </div>
      </header>

      {stores.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Magasins" value={shopCount} icon={StoreIcon} />
          <SummaryStat label="Dépôts" value={depotCount} icon={Warehouse} />
          <SummaryStat label="Unités en stock" value={totalUnits} icon={Package} tone="success" />
          <SummaryStat
            label="Alertes stock faible"
            value={totalLowStock}
            icon={AlertTriangle}
            tone={totalLowStock > 0 ? "warning" : "default"}
          />
        </div>
      )}

      <StoresAdminSection
        stores={stores}
        allowedCities={allowedCities}
        defaultCity={defaultCity}
        createOpen={storeCreateOpen}
        onCreateOpenChange={setStoreCreateOpen}
        hideTrigger
        hideFilters
      />

      <div className="border-t border-primary/15 pt-6">
        <HubAccountsManager
          hubAccounts={hubAccounts}
          retailStores={retailStores}
          assignmentsByHub={assignmentsByHub}
          showCreate={hubCreateOpen}
          onShowCreateChange={setHubCreateOpen}
          hideHeaderButton
        />
      </div>
    </div>
  );
}

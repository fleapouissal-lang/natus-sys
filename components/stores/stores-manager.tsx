"use client";

import { AlertTriangle, Package, Store, Users } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StoresAdminSection } from "@/components/stores/stores-admin-section";
import { cn } from "@/lib/utils";
import type { StoreWithStats } from "@/lib/types";

function SummaryStat({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof Store;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const toneClasses = {
    default: "border-border bg-surface text-foreground",
    warning: "border-warning/30 bg-warning/5 text-warning",
    success: "border-success/30 bg-success/5 text-success",
    danger: "border-danger/30 bg-danger/5 text-danger",
  } as const;

  return (
    <div className={cn("rounded-xl border p-4", toneClasses[tone])}>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon className="natus-icon h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function StoresManager({
  stores,
  allowedCities,
  defaultCity,
  cityLabel,
  canCreateStore = false,
}: {
  stores: StoreWithStats[];
  allowedCities: string[];
  defaultCity?: string;
  cityLabel?: string;
  canCreateStore?: boolean;
  canDeleteStore?: boolean;
}) {
  const totalUnits = stores.reduce((sum, store) => sum + store.totalUnits, 0);
  const totalLowStock = stores.reduce((sum, store) => sum + store.lowStockCount, 0);
  const totalActiveCashiers = stores.reduce(
    (sum, store) => sum + store.cashiers.filter((c) => c.is_active).length,
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Magasins</h1>
        <p className="mt-1 text-muted">
          {cityLabel ? `Points de vente — ${cityLabel}` : "Tous les magasins et dépôts"}
          {stores.length > 0
            ? ` · ${stores.length} point${stores.length !== 1 ? "s" : ""}`
            : ""}
        </p>
      </div>

      {stores.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Magasins" value={stores.length} icon={Store} />
          <SummaryStat label="Unités en stock" value={totalUnits} icon={Package} tone="success" />
          <SummaryStat
            label="Alertes stock faible"
            value={totalLowStock}
            icon={AlertTriangle}
            tone={totalLowStock > 0 ? "warning" : "default"}
          />
          <SummaryStat
            label="Caissiers actifs"
            value={totalActiveCashiers}
            icon={Users}
            tone={totalActiveCashiers > 0 ? "success" : "danger"}
          />
        </div>
      )}

      {canCreateStore ? (
        <StoresAdminSection
          stores={stores}
          allowedCities={allowedCities}
          defaultCity={defaultCity}
        />
      ) : (
        stores.length === 0 && (
          <Card>
            <CardHeader title="Aucun magasin" description="Créez un magasin pour commencer" />
          </Card>
        )
      )}
    </div>
  );
}

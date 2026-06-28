import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  PackageX,
  RotateCcw,
  Store,
  Warehouse,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  DesktopStatGrid,
  MobileStatCard,
  MobileStatGrid,
} from "@/components/dashboard/mobile-stat-card";
import type { HubDashboardStats } from "@/lib/hub/dashboard-stats";

export function HubDashboardStats({ stats }: { stats: HubDashboardStats }) {
  return (
    <div className="space-y-4">
      <MobileStatGrid className="md:hidden">
        <MobileStatCard
          label="Magasins assignés"
          value={String(stats.assignedStoresCount)}
          icon={Store}
        />
        <MobileStatCard
          label="Stock dépôt"
          value={String(stats.hubDepotUnits)}
          subtitle="Unités en entrepôt"
          icon={Warehouse}
          variant="gold"
        />
        <MobileStatCard
          label="Envois en cours"
          value={String(stats.outgoingInProgressCount)}
          icon={ArrowUpRight}
          variant={stats.outgoingInProgressCount > 0 ? "warning" : "default"}
        />
        <MobileStatCard
          label="Réceptions en attente"
          value={String(stats.incomingPendingCount)}
          icon={ArrowDownLeft}
          variant={stats.incomingPendingCount > 0 ? "warning" : "default"}
        />
        <MobileStatCard
          label="Stock faible réseau"
          value={String(stats.networkLowStockCount)}
          icon={AlertTriangle}
          variant={stats.networkLowStockCount > 0 ? "warning" : "default"}
        />
        <MobileStatCard
          label="Ruptures réseau"
          value={String(stats.networkOutOfStockCount)}
          icon={PackageX}
          variant={stats.networkOutOfStockCount > 0 ? "danger" : "default"}
        />
      </MobileStatGrid>

      <DesktopStatGrid>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Magasins assignés</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
            <Store className="h-5 w-5 text-primary" />
            {stats.assignedStoresCount}
          </p>
          <p className="mt-1 text-xs text-muted">Points de vente sous votre périmètre</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Stock dépôt</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
            <Warehouse className="h-5 w-5 text-primary" />
            {stats.hubDepotUnits}
          </p>
          <p className="mt-1 text-xs text-muted">
            {stats.hubLowStockCount > 0 || stats.hubOutOfStockCount > 0
              ? `${stats.hubLowStockCount} faible · ${stats.hubOutOfStockCount} rupture`
              : "Unités disponibles à l'entrepôt"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Envois en cours</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            {stats.outgoingInProgressCount}
          </p>
          <Link href="/hub/stock-transfers" className="mt-1 inline-block text-xs text-primary hover:underline">
            Voir les commandes envoyées →
          </Link>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Réceptions en attente</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
            <ArrowDownLeft className="h-5 w-5 text-primary" />
            {stats.incomingPendingCount}
          </p>
          <Link
            href="/hub/stock-transfers/received"
            className="mt-1 inline-block text-xs text-primary hover:underline"
          >
            Voir les commandes reçues →
          </Link>
        </Card>
      </DesktopStatGrid>

      <div className="hidden gap-4 md:grid md:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Alertes stock réseau</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
            {stats.networkLowStockCount}
            {stats.networkLowStockCount > 0 && (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
          </p>
          <p className="mt-1 text-xs text-muted">Produits entre 1 et 9 unités (magasins assignés)</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Ruptures réseau</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
            {stats.networkOutOfStockCount}
            {stats.networkOutOfStockCount > 0 && <PackageX className="h-5 w-5 text-danger" />}
          </p>
          <p className="mt-1 text-xs text-muted">Références à 0 unité sur les magasins assignés</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Annulations en attente</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
            {stats.pendingWriteoffsCount}
            {stats.pendingWriteoffsCount > 0 && <RotateCcw className="h-5 w-5 text-warning" />}
          </p>
          <Link href="/hub/writeoffs" className="mt-1 inline-block text-xs text-primary hover:underline">
            Voir les annulations dépôt →
          </Link>
        </Card>
      </div>

      <MobileStatGrid className="md:hidden">
        <MobileStatCard
          label="Annulations en attente"
          value={String(stats.pendingWriteoffsCount)}
          icon={RotateCcw}
          variant={stats.pendingWriteoffsCount > 0 ? "warning" : "default"}
        />
        <MobileStatCard
          label="Stock faible dépôt"
          value={String(stats.hubLowStockCount)}
          icon={Package}
          variant={stats.hubLowStockCount > 0 ? "warning" : "default"}
        />
      </MobileStatGrid>
    </div>
  );
}

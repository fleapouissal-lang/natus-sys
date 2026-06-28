import {
  ArrowUpRight,
  ArrowDownLeft,
  Boxes,
  Gauge,
  Layers,
  PackageCheck,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  hubTransferStatusLabel,
  hubTransferStatusVariant,
} from "@/lib/hub-transfer-status";
import type { HubDashboardAnalytics } from "@/lib/hub/dashboard-stats";

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
        <Icon className="h-5 w-5 text-primary" />
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

export function HubDashboardAnalytics({ stats }: { stats: HubDashboardAnalytics }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Analyse de l&apos;activité dépôt</h2>
        <p className="mt-1 text-sm text-muted">
          Statistiques des {stats.periodDays} derniers jours — dépôt et magasins assignés uniquement
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Envois (30 j)"
          value={String(stats.outgoingCount)}
          hint={`${stats.outgoingUnits} unités expédiées`}
          icon={ArrowUpRight}
        />
        <StatTile
          label="Réceptions (30 j)"
          value={String(stats.incomingCount)}
          hint={`${stats.incomingUnits} unités reçues`}
          icon={ArrowDownLeft}
        />
        <StatTile
          label="Unités / envoi"
          value={String(stats.avgUnitsPerOutgoing)}
          hint="Volume moyen par commande"
          icon={Gauge}
        />
        <StatTile
          label="Taux de livraison"
          value={`${stats.fulfillmentRate}%`}
          hint={`${stats.completedOutgoingCount} livrés · ${stats.openOutgoingCount} en cours`}
          icon={PackageCheck}
        />
        <StatTile
          label="Références dépôt"
          value={String(stats.hubSkuCount)}
          hint="Produits référencés à l'entrepôt"
          icon={Layers}
        />
        <StatTile
          label="Unités réseau"
          value={String(stats.networkUnits)}
          hint="Stock cumulé magasins assignés"
          icon={Boxes}
        />
      </div>

      {stats.statusBreakdown.length > 0 && (
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Statut des envois (30 j)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.statusBreakdown.map((row) => (
              <Badge key={row.status} variant={hubTransferStatusVariant(row.status)}>
                {hubTransferStatusLabel(row.status)} · {row.count}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card padding={false}>
          <div className="flex items-center gap-2 border-b border-border px-4 py-4 md:px-6">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Top produits expédiés</h3>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted md:px-6">
              Aucun envoi sur la période
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary-light/50">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted md:px-6">Produit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted md:px-6">Envois</th>
                    <th className="px-4 py-3 text-right font-medium text-muted md:px-6">Unités</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProducts.map((product) => (
                    <tr
                      key={product.productId}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium md:px-6">{product.productName}</td>
                      <td className="px-4 py-3 text-right tabular-nums md:px-6">
                        {product.transfers}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums md:px-6">
                        {product.units}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="flex items-center gap-2 border-b border-border px-4 py-4 md:px-6">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Volume par magasin</h3>
          </div>
          {stats.storeFlow.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted md:px-6">
              Aucun envoi vers les magasins sur la période
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary-light/50">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted md:px-6">Magasin</th>
                    <th className="px-4 py-3 text-right font-medium text-muted md:px-6">Envois</th>
                    <th className="px-4 py-3 text-right font-medium text-muted md:px-6">Unités</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.storeFlow.map((store) => (
                    <tr
                      key={store.storeId}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-3 md:px-6">
                        <p className="font-medium">{store.storeName}</p>
                        {store.city ? (
                          <p className="text-xs text-muted">{store.city}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums md:px-6">
                        {store.outgoingCount}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums md:px-6">
                        {store.outgoingUnits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

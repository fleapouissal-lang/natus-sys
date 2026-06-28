import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowDownLeft, ArrowUpRight, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  hubTransferStatusLabel,
  hubTransferStatusVariant,
} from "@/lib/hub-transfer-status";
import type { HubDashboardStats } from "@/lib/hub/dashboard-stats";
import { formatDate } from "@/lib/utils";

function TransferSummaryTable({
  title,
  icon: Icon,
  transfers,
  emptyMessage,
  viewAllHref,
  direction,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  transfers: HubDashboardStats["recentOutgoing"];
  emptyMessage: string;
  viewAllHref: string;
  direction: "outgoing" | "incoming";
}) {
  return (
    <Card padding={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <Link href={viewAllHref} className="text-sm font-medium text-primary hover:underline">
          Tout voir →
        </Link>
      </div>
      {transfers.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted md:px-6">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary-light/50">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted md:px-6">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted md:px-6">
                  {direction === "outgoing" ? "Destination" : "Origine"}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted md:px-6">Statut</th>
                <th className="px-4 py-3 text-right font-medium text-muted md:px-6">Unités</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="border-b border-border last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3 md:px-6">
                    {formatDate(transfer.sent_at)}
                  </td>
                  <td className="px-4 py-3 md:px-6">
                    <p className="font-medium">
                      {direction === "outgoing"
                        ? transfer.to_store_name || "—"
                        : transfer.from_store_name || "—"}
                    </p>
                    <p className="text-xs text-muted">
                      {direction === "outgoing"
                        ? transfer.to_store_city
                        : transfer.from_store_city}
                    </p>
                  </td>
                  <td className="px-4 py-3 md:px-6">
                    <Badge variant={hubTransferStatusVariant(transfer.status)}>
                      {hubTransferStatusLabel(transfer.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums md:px-6">
                    {transfer.total_units}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function HubDashboardSummaryTables({ stats }: { stats: HubDashboardStats }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <TransferSummaryTable
        title="Envois dépôt en cours"
        icon={ArrowUpRight}
        transfers={stats.recentOutgoing}
        emptyMessage="Aucun envoi en cours depuis le dépôt"
        viewAllHref="/hub/stock-transfers"
        direction="outgoing"
      />
      <TransferSummaryTable
        title="Réceptions en attente"
        icon={ArrowDownLeft}
        transfers={stats.recentIncoming}
        emptyMessage="Aucune réception magasin → dépôt en attente"
        viewAllHref="/hub/stock-transfers/received"
        direction="incoming"
      />

      <Card padding={false} className="xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Store className="h-5 w-5 text-primary" />
            Magasins assignés — alertes stock
          </h2>
          <Link href="/hub/stock" className="text-sm font-medium text-primary hover:underline">
            Consulter les stocks →
          </Link>
        </div>
        {stats.storesAtRisk.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted md:px-6">
            Aucune alerte stock sur les magasins assignés
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-light/50">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted md:px-6">Magasin</th>
                  <th className="px-4 py-3 text-right font-medium text-muted md:px-6">Unités</th>
                  <th className="px-4 py-3 text-right font-medium text-muted md:px-6">Stock faible</th>
                  <th className="px-4 py-3 text-right font-medium text-muted md:px-6">Ruptures</th>
                  <th className="px-4 py-3 text-right font-medium text-muted md:px-6" />
                </tr>
              </thead>
              <tbody>
                {stats.storesAtRisk.map((store) => (
                  <tr key={store.storeId} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 md:px-6">
                      <p className="font-medium">{store.storeName}</p>
                      <p className="text-xs text-muted">{store.city}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums md:px-6">{store.totalUnits}</td>
                    <td className="px-4 py-3 text-right tabular-nums md:px-6">
                      {store.lowStockCount > 0 ? (
                        <Badge variant="warning">{store.lowStockCount}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums md:px-6">
                      {store.outOfStockCount > 0 ? (
                        <Badge variant="danger">{store.outOfStockCount}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right md:px-6">
                      <Link
                        href={`/hub/stock?store=${store.storeId}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Stock
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

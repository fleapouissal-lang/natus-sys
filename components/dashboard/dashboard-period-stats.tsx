"use client";

import { Banknote, CreditCard, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MobileStatCard, MobileStatGrid, DesktopStatGrid } from "@/components/dashboard/mobile-stat-card";
import { formatCurrency } from "@/lib/utils";
import type { StoreTrackingPeriodRow } from "@/lib/store-tracking-filter";

export function DashboardPeriodStats({
  rows,
  periodLabel,
}: {
  rows: StoreTrackingPeriodRow[];
  periodLabel: string;
}) {
  if (rows.length === 0) return null;

  const revenue = rows.reduce((s, r) => s + r.periodRevenue, 0);
  const sales = rows.reduce((s, r) => s + r.periodSales, 0);
  const cash = rows.reduce((s, r) => s + r.periodCashRevenue, 0);
  const card = rows.reduce((s, r) => s + r.periodCardRevenue, 0);
  const lowStock = rows.reduce((s, r) => s + r.lowStockCount, 0);
  const units = rows.reduce((s, r) => s + r.totalUnits, 0);
  const averageTicket = sales > 0 ? revenue / sales : 0;

  return (
    <>
      <MobileStatGrid>
        <MobileStatCard
          label={`CA · ${periodLabel}`}
          value={formatCurrency(revenue)}
          subtitle={`${sales} vente${sales !== 1 ? "s" : ""}`}
          icon={TrendingUp}
          variant="gold"
        />
        <MobileStatCard
          label="Panier moyen"
          value={formatCurrency(averageTicket)}
          icon={ShoppingBag}
        />
        <MobileStatCard
          label="Espèces"
          value={formatCurrency(cash)}
          icon={Banknote}
        />
        <MobileStatCard
          label="TPE"
          value={formatCurrency(card)}
          icon={CreditCard}
        />
        <MobileStatCard
          label="Stock faible"
          value={String(lowStock)}
          icon={Package}
          variant={lowStock > 0 ? "warning" : "success"}
        />
      </MobileStatGrid>

      <DesktopStatGrid>
        <Card>
          <p className="text-sm text-muted">CA — {periodLabel}</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(revenue)}</p>
          <p className="mt-1 text-xs text-muted">
            {sales} vente{sales !== 1 ? "s" : ""}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Panier moyen</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(averageTicket)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Banknote className="h-4 w-4" />
            Espèces
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(cash)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <CreditCard className="h-4 w-4" />
            TPE
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(card)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Unités en stock</p>
          <p className="mt-1 text-2xl font-bold">{units}</p>
          <p className="mt-1 text-xs text-muted">
            {lowStock} alerte{lowStock !== 1 ? "s" : ""} stock faible
          </p>
        </Card>
      </DesktopStatGrid>
    </>
  );
}

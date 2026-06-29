"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Clock,
  CreditCard,
  Loader2,
  Minus,
  Package,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { natusFilterChipClass } from "@/components/ui/natus-filter-chip";
import { fetchDashboardAnalytics } from "@/lib/dashboard/dashboard-analytics-actions";
import type { DashboardAnalyticsPayload } from "@/lib/dashboard/analytics-types";
import {
  DASHBOARD_REPORT_PERIODS,
  LIMITED_STORE_STAFF_REPORT_PERIODS,
  type DashboardReportPeriod,
} from "@/lib/dashboard/report-period";
import { formatCurrency, toLocalDateKey } from "@/lib/utils";
import {
  clampDateToManagerSalesWindow,
  getManagerSalesHistoryDateBounds,
} from "@/lib/sales/manager-sales-window";
import { DateInputField } from "@/components/ui/date-input-field";

function TrendBadge({
  delta,
  previousLabel,
}: {
  delta: number | null;
  previousLabel: string;
}) {
  if (delta === null || !previousLabel) {
    return <span className="text-xs text-muted">—</span>;
  }

  const positive = delta >= 0;
  const flat = Math.abs(delta) < 0.05;

  if (flat) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
        <Minus className="h-3 w-3" />
        Stable vs {previousLabel.toLowerCase()}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        positive ? "text-success" : "text-danger"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" />
      )}
      {Math.abs(delta).toFixed(1)}% vs {previousLabel.toLowerCase()}
    </span>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  delta,
  previousLabel,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  subtitle?: string;
  delta?: number | null;
  previousLabel?: string;
  icon: typeof TrendingUp;
  accent?: boolean;
}) {
  return (
    <div
      className={`natus-analytics-kpi rounded-xl border p-4 ${
        accent
          ? "border-primary/30 bg-gradient-to-br from-champagne/40 to-surface"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <span className="rounded-md bg-primary-light p-1.5 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      {previousLabel !== undefined && (
        <div className="mt-2">
          <TrendBadge delta={delta ?? null} previousLabel={previousLabel} />
        </div>
      )}
    </div>
  );
}

function DailyRevenueChart({
  series,
}: {
  series: DashboardAnalyticsPayload["dailySeries"];
}) {
  const maxRevenue = Math.max(...series.map((d) => d.revenue), 1);

  if (series.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Aucune vente sur la période</p>;
  }

  return (
    <div className="natus-analytics-chart">
      <div className="flex h-44 items-end gap-1 sm:gap-1.5">
        {series.map((point) => {
          const height = Math.max((point.revenue / maxRevenue) * 100, point.revenue > 0 ? 4 : 0);
          return (
            <div
              key={point.dateKey}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${point.label} · ${formatCurrency(point.revenue)} · ${point.sales} vente(s)`}
            >
              <div className="relative flex h-36 w-full items-end justify-center">
                <div
                  className="w-full max-w-[2rem] rounded-t-md bg-gradient-to-t from-primary to-champagne transition-opacity group-hover:opacity-90"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="truncate text-[10px] text-muted sm:text-xs">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentMixBars({
  mix,
  total,
}: {
  mix: DashboardAnalyticsPayload["paymentMix"];
  total: number;
}) {
  if (mix.length === 0 || total <= 0) {
    return <p className="py-6 text-center text-sm text-muted">Aucun paiement enregistré</p>;
  }

  const colors: Record<string, string> = {
    cash: "bg-success",
    card: "bg-primary",
    cheque: "bg-muted",
  };

  return (
    <div className="space-y-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-border/40">
        {mix.map((slice) => (
          <div
            key={slice.method}
            className={`${colors[slice.method] || "bg-primary"} transition-all`}
            style={{ width: `${slice.percent}%` }}
            title={`${slice.label} ${slice.percent.toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {mix.map((slice) => (
          <li key={slice.method} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${colors[slice.method] || "bg-primary"}`}
              />
              {slice.label}
            </span>
            <span className="tabular-nums text-muted">
              {formatCurrency(slice.amount)}{" "}
              <span className="text-foreground">({slice.percent.toFixed(0)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HourlyActivityChart({
  series,
}: {
  series: DashboardAnalyticsPayload["hourlySeries"];
}) {
  const peak = Math.max(...series.map((h) => h.sales), 1);
  const activeHours = series.filter((h) => h.sales > 0);

  if (activeHours.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Pas d&apos;activité horaire</p>;
  }

  return (
    <div className="flex h-28 items-end gap-0.5">
      {series.map((hour) => {
        const height = Math.max((hour.sales / peak) * 100, hour.sales > 0 ? 6 : 0);
        return (
          <div
            key={hour.hour}
            className="group flex flex-1 flex-col items-center gap-0.5"
            title={`${hour.label} · ${hour.sales} vente(s) · ${formatCurrency(hour.revenue)}`}
          >
            <div
              className="w-full rounded-sm bg-primary/25 group-hover:bg-primary/45"
              style={{ height: `${height}%`, minHeight: hour.sales > 0 ? "4px" : "1px" }}
            />
            {hour.hour % 3 === 0 && (
              <span className="text-[9px] text-muted">{hour.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-border/30" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-border/30" />
        <div className="h-64 rounded-xl bg-border/30" />
      </div>
    </div>
  );
}

export function DashboardAnalyticsPanel({
  storeIds,
  scopeLabel,
  allStoreIds,
  allScopeLabel,
  title = "Analytique avancée",
  className = "",
  hidePeriodFilter = false,
  storeStaffMode = false,
  controlledPeriod,
  controlledCustomFrom = "",
  controlledCustomTo = "",
}: {
  storeIds: string[];
  scopeLabel: string;
  allStoreIds?: string[];
  allScopeLabel?: string;
  title?: string;
  className?: string;
  /** Masque le sélecteur de période interne (piloté par un filtre global). */
  hidePeriodFilter?: boolean;
  /** Dépôt / gérant / caissier : pas de CA, aujourd'hui ou date à date (max 3 jours avant). */
  storeStaffMode?: boolean;
  /** Période imposée depuis l'extérieur (mode contrôlé). */
  controlledPeriod?: DashboardReportPeriod | "custom";
  controlledCustomFrom?: string;
  controlledCustomTo?: string;
}) {
  const [internalPeriod, setInternalPeriod] = useState<DashboardReportPeriod | "custom">(
    storeStaffMode ? "today" : "week"
  );
  const todayKey = toLocalDateKey(new Date());
  const historyBounds = getManagerSalesHistoryDateBounds();
  const [internalCustomFrom, setInternalCustomFrom] = useState(todayKey);
  const [internalCustomTo, setInternalCustomTo] = useState(todayKey);
  const [multiStore, setMultiStore] = useState(false);
  const [data, setData] = useState<DashboardAnalyticsPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, startLoad] = useTransition();

  const period: DashboardReportPeriod | "custom" =
    hidePeriodFilter && controlledPeriod ? controlledPeriod : internalPeriod;
  const customFrom = hidePeriodFilter
    ? controlledCustomFrom
    : storeStaffMode
      ? internalCustomFrom
      : "";
  const customTo = hidePeriodFilter
    ? controlledCustomTo
    : storeStaffMode
      ? internalCustomTo
      : "";

  const canToggleAllStores = Boolean(allStoreIds && allStoreIds.length > 1);
  const effectiveIds = useMemo(
    () => (multiStore && allStoreIds?.length ? allStoreIds : storeIds),
    [multiStore, allStoreIds, storeIds]
  );
  const effectiveScope =
    multiStore && allScopeLabel ? allScopeLabel : scopeLabel;
  const idsKey = effectiveIds.join(",");

  useEffect(() => {
    if (effectiveIds.length === 0) {
      setData(null);
      return;
    }

    startLoad(async () => {
      setError("");
      const result = await fetchDashboardAnalytics({
        storeIds: effectiveIds,
        period,
        customFrom,
        customTo,
        scopeLabel: effectiveScope,
      });
      if ("error" in result) {
        setError(result.error);
        setData(null);
        return;
      }
      setData(result.data);
    });
  }, [idsKey, period, customFrom, customTo, effectiveScope]);

  const cashShare =
    data && data.current.revenue > 0
      ? (data.current.cashRevenue / data.current.revenue) * 100
      : 0;
  const cardShare =
    data && data.current.revenue > 0
      ? (data.current.cardRevenue / data.current.revenue) * 100
      : 0;

  const periodOptions = storeStaffMode
    ? LIMITED_STORE_STAFF_REPORT_PERIODS
    : DASHBOARD_REPORT_PERIODS;

  return (
    <div className={`space-y-6 ${className}`}>
      <Card padding={false} className="overflow-hidden border-primary/20">
        <div className="border-b border-border bg-gradient-to-r from-champagne/30 to-surface px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{title}</h2>
              </div>
              <p className="mt-1 text-sm text-muted">{effectiveScope || "Périmètre actuel"}</p>
              {data && (
                <p className="mt-0.5 text-xs text-muted">
                  Période : {data.periodLabel}
                  {data.previousPeriodLabel
                    ? ` · comparé à ${data.previousPeriodLabel.toLowerCase()}`
                    : ""}
                </p>
              )}
            </div>
          </div>

          {canToggleAllStores && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMultiStore(false)}
                className={natusFilterChipClass(!multiStore)}
              >
                Magasin sélectionné
              </button>
              <button
                type="button"
                onClick={() => setMultiStore(true)}
                className={natusFilterChipClass(multiStore)}
              >
                Tous les magasins
              </button>
            </div>
          )}

          {!hidePeriodFilter && (
            <div className="mt-4 flex flex-wrap gap-2">
              {periodOptions.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setInternalPeriod(id)}
                  disabled={loading}
                  className={natusFilterChipClass(internalPeriod === id)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {storeStaffMode && !hidePeriodFilter && internalPeriod === "custom" && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-xl lg:items-end">
              <DateInputField
                label="Date début"
                value={internalCustomFrom}
                onChange={(value) =>
                  setInternalCustomFrom(clampDateToManagerSalesWindow(value, historyBounds))
                }
                minDate={historyBounds.minDate}
                maxDate={historyBounds.maxDate}
              />
              <DateInputField
                label="Date fin"
                value={internalCustomTo}
                onChange={(value) =>
                  setInternalCustomTo(clampDateToManagerSalesWindow(value, historyBounds))
                }
                minDate={historyBounds.minDate}
                maxDate={historyBounds.maxDate}
              />
            </div>
          )}
        </div>
      </Card>

      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {loading && !data && <AnalyticsSkeleton />}

      {data && (
        <>
          <div
            className={`grid gap-3 ${
              storeStaffMode
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            }`}
          >
            {!storeStaffMode && (
              <>
                <KpiCard
                  label="Chiffre d'affaires"
                  value={formatCurrency(data.current.revenue)}
                  subtitle={`${data.current.salesCount} vente${data.current.salesCount !== 1 ? "s" : ""}`}
                  delta={data.trend.revenueDelta}
                  previousLabel={data.previousPeriodLabel}
                  icon={TrendingUp}
                  accent
                />
                <KpiCard
                  label="Panier moyen"
                  value={formatCurrency(data.current.averageTicket)}
                  delta={data.trend.ticketDelta}
                  previousLabel={data.previousPeriodLabel}
                  icon={ShoppingBag}
                />
                <KpiCard
                  label="Espèces"
                  value={formatCurrency(data.current.cashRevenue)}
                  subtitle={`${cashShare.toFixed(0)}% du CA`}
                  icon={Banknote}
                />
                <KpiCard
                  label="TPE"
                  value={formatCurrency(data.current.cardRevenue)}
                  subtitle={`${cardShare.toFixed(0)}% du CA`}
                  icon={CreditCard}
                />
                <KpiCard
                  label="Annulations"
                  value={`${data.current.cancellationRate.toFixed(1)}%`}
                  subtitle={`${data.current.cancelledCount} vente${data.current.cancelledCount !== 1 ? "s" : ""}`}
                  delta={data.trend.salesDelta}
                  previousLabel={data.previousPeriodLabel}
                  icon={Minus}
                />
              </>
            )}
            <KpiCard
              label="Stock"
              value={String(data.totalUnits)}
              subtitle={`${data.stockAlerts} alerte${data.stockAlerts !== 1 ? "s" : ""} · ${data.catalogueSize} refs`}
              icon={Package}
              accent={storeStaffMode}
            />
          </div>

          {!storeStaffMode && (
            <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Évolution du CA journalier
              </h3>
              <DailyRevenueChart series={data.dailySeries} />
            </Card>

            <Card className="p-4 sm:p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-primary" />
                Répartition des paiements
              </h3>
              <PaymentMixBars mix={data.paymentMix} total={data.current.revenue} />
            </Card>
          </div>

          <Card className="p-4 sm:p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              Activité par heure
            </h3>
            <HourlyActivityChart series={data.hourlySeries} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card padding={false}>
              <div className="border-b border-border px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold">Top produits</h3>
              </div>
              {data.topProducts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">Aucun produit</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted">
                        <th className="px-4 py-2 font-medium sm:px-5">Produit</th>
                        <th className="px-4 py-2 font-medium sm:px-5">Qté</th>
                        <th className="px-4 py-2 font-medium sm:px-5">CA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((row) => (
                        <tr key={row.name} className="border-b border-border/60 last:border-0">
                          <td className="max-w-[12rem] truncate px-4 py-2.5 sm:px-5">{row.name}</td>
                          <td className="px-4 py-2.5 tabular-nums sm:px-5">{row.quantity}</td>
                          <td className="px-4 py-2.5 tabular-nums font-medium sm:px-5">
                            {formatCurrency(row.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card padding={false}>
              <div className="border-b border-border px-4 py-3 sm:px-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-primary" />
                  Top caissiers
                </h3>
              </div>
              {data.topCashiers.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">Aucun caissier</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted">
                        <th className="px-4 py-2 font-medium sm:px-5">Caissier</th>
                        <th className="px-4 py-2 font-medium sm:px-5">Ventes</th>
                        <th className="px-4 py-2 font-medium sm:px-5">CA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCashiers.map((row) => (
                        <tr key={row.name} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-2.5 sm:px-5">{row.name}</td>
                          <td className="px-4 py-2.5 tabular-nums sm:px-5">{row.sales}</td>
                          <td className="px-4 py-2.5 tabular-nums font-medium sm:px-5">
                            {formatCurrency(row.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {data.storeRanking.length > 1 && (
            <Card padding={false}>
              <div className="border-b border-border px-4 py-3 sm:px-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Store className="h-4 w-4 text-primary" />
                  Classement des magasins
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="px-4 py-2 font-medium sm:px-5">#</th>
                      <th className="px-4 py-2 font-medium sm:px-5">Magasin</th>
                      <th className="px-4 py-2 font-medium sm:px-5">Ville</th>
                      <th className="px-4 py-2 font-medium sm:px-5">Ventes</th>
                      <th className="px-4 py-2 font-medium sm:px-5">CA</th>
                      <th className="px-4 py-2 font-medium sm:px-5">Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.storeRanking.map((row, index) => (
                      <tr key={row.storeId} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2.5 tabular-nums text-muted sm:px-5">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium sm:px-5">{row.storeName}</td>
                        <td className="px-4 py-2.5 text-muted sm:px-5">{row.city}</td>
                        <td className="px-4 py-2.5 tabular-nums sm:px-5">{row.sales}</td>
                        <td className="px-4 py-2.5 tabular-nums font-medium sm:px-5">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 min-w-[4rem] flex-1 max-w-[6rem] overflow-hidden rounded-full bg-border/40">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${row.share}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-xs text-muted">
                              {row.share.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
            </>
          )}
        </>
      )}
    </div>
  );
}

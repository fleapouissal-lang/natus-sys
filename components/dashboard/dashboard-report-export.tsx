"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { natusFilterChipClass } from "@/components/ui/natus-filter-chip";
import { fetchDashboardReport } from "@/lib/dashboard/dashboard-report-actions";
import { downloadDashboardReportExcel } from "@/lib/dashboard/export-dashboard-report";
import {
  DASHBOARD_REPORT_PERIODS,
  type DashboardReportPeriod,
} from "@/lib/dashboard/report-period";

export function DashboardReportExport({
  storeIds,
  scopeLabel,
  allStoreIds,
  allScopeLabel,
  className = "",
}: {
  storeIds: string[];
  scopeLabel: string;
  /** Tous les magasins accessibles (export multi-magasins). */
  allStoreIds?: string[];
  allScopeLabel?: string;
  className?: string;
}) {
  const [period, setPeriod] = useState<DashboardReportPeriod>("week");
  const [multiStore, setMultiStore] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const canExportAll = Boolean(allStoreIds && allStoreIds.length > 1);
  const effectiveIds = multiStore && allStoreIds?.length ? allStoreIds : storeIds;
  const effectiveScope =
    multiStore && allScopeLabel ? allScopeLabel : scopeLabel;

  function handleDownload() {
    if (effectiveIds.length === 0) {
      setError("Sélectionnez au moins un magasin.");
      return;
    }

    startTransition(async () => {
      setError("");
      const result = await fetchDashboardReport({
        storeIds: effectiveIds,
        period,
        scopeLabel: effectiveScope,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      await downloadDashboardReportExcel(result.data, period);
    });
  }

  return (
    <div className={`natus-filter-bar overflow-visible rounded-2xl p-4 md:rounded-lg ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Exporter le rapport Excel</p>
          <p className="mt-0.5 text-sm text-muted">{effectiveScope || "Périmètre actuel"}</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleDownload}
          disabled={pending || effectiveIds.length === 0}
          className="gap-2"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Télécharger
        </Button>
      </div>

      {canExportAll && (
        <div className="mt-3 flex flex-wrap gap-2">
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

      <div className="mt-3 flex flex-wrap gap-2">
        {DASHBOARD_REPORT_PERIODS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPeriod(id)}
            disabled={pending}
            className={natusFilterChipClass(period === id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Loader2,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import { DayClosureTicket } from "@/components/pos/day-closure-ticket";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import {
  formatDayClosureDate,
  uniqueCashierLabels,
} from "@/lib/sales/day-closure";
import {
  downloadDayClosureHtml,
  type DayClosureDownloadData,
} from "@/lib/sales/download-day-closure";
import { downloadZReportExcel } from "@/lib/sales/export-z-report";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";
import {
  fetchZReportClosureSales,
  fetchZReportPayload,
  fetchZReportPreview,
  fetchZReportSites,
} from "@/lib/sales/z-report-actions";
import type { ZReportSiteOption } from "@/lib/sales/z-report-types";
import { formatCurrency, cn } from "@/lib/utils";
import type { Sale } from "@/lib/types";

const ALL_SITES = "";

function siteLabel(site: ZReportSiteOption): string {
  return `${site.name}${site.isHub ? " (dépôt)" : ""} — ${site.city}`;
}

function closureCashierLabel(sales: Sale[], fallback?: string): string | undefined {
  const labels = uniqueCashierLabels(sales);
  if (labels.length === 0) return fallback;
  if (labels.length === 1) return labels[0];
  return labels.join(", ");
}

export function ZReportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [sites, setSites] = useState<ZReportSiteOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(ALL_SITES);
  const [previewClosure, setPreviewClosure] = useState<StoreDayClosureReportRow | null>(null);
  const [previewSales, setPreviewSales] = useState<Sale[]>([]);
  const [scopeLabel, setScopeLabel] = useState("");
  const [sitesCount, setSitesCount] = useState(0);
  const [mode, setMode] = useState<"single" | "multi">("multi");
  const [error, setError] = useState("");
  const [loadingPreview, startPreview] = useTransition();
  const [exportingBasic, startBasicExport] = useTransition();
  const [exportingAdvanced, startAdvancedExport] = useTransition();
  const [bootstrapping, startBootstrap] = useTransition();

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedStoreId),
    [sites, selectedStoreId]
  );

  const loadPreview = useCallback((storeId: string) => {
    startPreview(async () => {
      setError("");
      setPreviewClosure(null);
      setPreviewSales([]);

      const previewResult = await fetchZReportPreview(storeId || null);
      if ("error" in previewResult) {
        setError(previewResult.error);
        return;
      }

      setScopeLabel(previewResult.scopeLabel);
      setMode(previewResult.mode);
      setSitesCount(previewResult.sitesCount);

      if (previewResult.mode === "single" && previewResult.closure) {
        const salesResult = await fetchZReportClosureSales(
          previewResult.closure.store_id,
          previewResult.closure.business_date
        );
        if ("error" in salesResult) {
          setError(salesResult.error);
          return;
        }
        setPreviewClosure(previewResult.closure);
        setPreviewSales(salesResult.sales);
      }
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    startBootstrap(async () => {
      setError("");
      const sitesResult = await fetchZReportSites();
      if ("error" in sitesResult) {
        setError(sitesResult.error);
        return;
      }
      setSites(sitesResult.sites);
      setSelectedStoreId(ALL_SITES);
      loadPreview(ALL_SITES);
    });
  }, [open, loadPreview]);

  function handleSelectSite(storeId: string) {
    setSelectedStoreId(storeId);
    loadPreview(storeId);
  }

  function handleDownloadBasic() {
    if (mode === "single" && previewClosure && previewSales.length >= 0) {
      startBasicExport(async () => {
        setError("");
        const payload: DayClosureDownloadData = {
          closureId: previewClosure.id,
          dateKey: previewClosure.business_date,
          storeName: previewClosure.store_name,
          cashierLabel: closureCashierLabel(previewSales, previewClosure.requested_by_name),
          stats: previewClosure.stats,
          sales: previewSales,
        };
        downloadDayClosureHtml(payload);
      });
      return;
    }

    startBasicExport(async () => {
      setError("");
      const payloadResult = await fetchZReportPayload(null);
      if ("error" in payloadResult) {
        setError(payloadResult.error);
        return;
      }
      if (payloadResult.data.closures.length === 1) {
        const block = payloadResult.data.closures[0]!;
        downloadDayClosureHtml({
          closureId: block.closure.id,
          dateKey: block.closure.business_date,
          storeName: block.closure.store_name,
          cashierLabel: closureCashierLabel(block.sales, block.closure.requested_by_name),
          stats: block.closure.stats,
          sales: block.sales,
        });
        return;
      }
      setError(
        "Mode multi-sites : utilisez « Z-rapport avancé » pour exporter toutes les clôtures en Excel."
      );
    });
  }

  function handleDownloadAdvanced() {
    startAdvancedExport(async () => {
      setError("");
      const payloadResult = await fetchZReportPayload(selectedStoreId || null);
      if ("error" in payloadResult) {
        setError(payloadResult.error);
        return;
      }
      await downloadZReportExcel(payloadResult.data);
    });
  }

  if (!open) return null;

  return (
    <Modal onClose={onClose} size="lg" className="!max-w-[min(96vw,980px)] !p-0">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold text-primary-dark">Z-rapport</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Dernière clôture validée par site — export ticket ou analyse Excel avancée
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-primary/10 hover:text-primary-dark"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(240px,280px)_1fr]">
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Magasins & dépôts
          </p>
          <div className="max-h-[min(52vh,420px)] space-y-1 overflow-y-auto scrollbar-natus pr-1">
            <button
              type="button"
              onClick={() => handleSelectSite(ALL_SITES)}
              disabled={loadingPreview || bootstrapping}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                selectedStoreId === ALL_SITES
                  ? "border-primary bg-primary-light/50 text-primary-dark"
                  : "border-border bg-surface hover:border-primary/40"
              )}
            >
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium">Tous les sites</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Analyse toutes les dernières clôtures
                </span>
              </span>
            </button>

            {sites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => handleSelectSite(site.id)}
                disabled={loadingPreview || bootstrapping}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  selectedStoreId === site.id
                    ? "border-primary bg-primary-light/50 text-primary-dark"
                    : "border-border bg-surface hover:border-primary/40"
                )}
              >
                {site.isHub ? (
                  <Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
                <span>
                  <span className="font-medium">{site.name}</span>
                  {site.isHub && (
                    <span className="ml-1 text-xs font-medium text-primary">Dépôt</span>
                  )}
                  <span className="mt-0.5 block text-xs text-muted">{site.city}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-[320px] flex-col">
          <div className="flex-1 p-4">
            {(loadingPreview || bootstrapping) && (
              <div className="flex h-full min-h-[240px] items-center justify-center gap-2 text-sm text-muted">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Chargement du rapport…
              </div>
            )}

            {!loadingPreview && !bootstrapping && mode === "single" && previewClosure && (
              <div className="space-y-3">
                <Card className="border-primary/20 bg-primary-light/20 p-4">
                  <p className="text-sm font-medium text-primary-dark">{scopeLabel}</p>
                  <p className="mt-1 text-sm capitalize text-muted">
                    Dernière clôture : {formatDayClosureDate(previewClosure.business_date)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span>
                      <span className="text-muted">Ventes</span>{" "}
                      <span className="font-semibold tabular-nums">
                        {previewClosure.stats.count}
                      </span>
                    </span>
                    <span>
                      <span className="text-muted">CA</span>{" "}
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(previewClosure.stats.total)}
                      </span>
                    </span>
                  </div>
                </Card>

                <div className="natus-closure-screen flex justify-center overflow-x-auto rounded-xl border border-border bg-[#ebe6dc] p-3 scrollbar-natus">
                  <DayClosureTicket
                    sales={previewSales}
                    stats={previewClosure.stats}
                    dateKey={previewClosure.business_date}
                    storeName={previewClosure.store_name}
                    cashierLabel={closureCashierLabel(
                      previewSales,
                      previewClosure.requested_by_name
                    )}
                    printId={null}
                  />
                </div>
              </div>
            )}

            {!loadingPreview && !bootstrapping && mode === "multi" && (
              <div className="space-y-4">
                <Card className="border-primary/20 bg-gradient-to-br from-champagne/20 to-surface p-5">
                  <p className="text-sm font-medium text-primary-dark">{scopeLabel}</p>
                  <p className="mt-2 text-sm text-muted">
                    {sitesCount > 0
                      ? `${sitesCount} dernière${sitesCount !== 1 ? "s" : ""} clôture${sitesCount !== 1 ? "s" : ""} validée${sitesCount !== 1 ? "s" : ""} seront analysées (magasins + dépôts).`
                      : "Aucune clôture validée disponible pour l'analyse multi-sites."}
                  </p>
                  <p className="mt-3 text-xs text-muted">
                    Le Z-rapport avancé agrège produits vendus, statistiques, tableaux comparatifs
                    et graphiques dans un fichier Excel.
                  </p>
                </Card>

                {selectedSite && (
                  <p className="text-sm text-muted">
                    Site sélectionné dans la liste :{" "}
                    <span className="font-medium text-foreground">{siteLabel(selectedSite)}</span>
                  </p>
                )}
              </div>
            )}

            {!loadingPreview &&
              !bootstrapping &&
              mode === "single" &&
              !previewClosure && (
                <Card className="py-10 text-center text-sm text-muted">
                  Aucune clôture validée pour ce site.
                </Card>
              )}
          </div>

          <div className="border-t border-border bg-surface/80 px-4 py-4">
            {error && (
              <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  exportingBasic ||
                  exportingAdvanced ||
                  loadingPreview ||
                  bootstrapping ||
                  (mode === "single" && !previewClosure) ||
                  (mode === "multi" && sitesCount === 0)
                }
                onClick={handleDownloadBasic}
                className="gap-2 px-4 py-2.5"
              >
                {exportingBasic ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Télécharger le rapport
              </Button>

              <Button
                type="button"
                disabled={
                  exportingBasic ||
                  exportingAdvanced ||
                  loadingPreview ||
                  bootstrapping ||
                  sitesCount === 0
                }
                onClick={handleDownloadAdvanced}
                className="gap-2 px-4 py-2.5 font-semibold"
              >
                {exportingAdvanced ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5" />
                )}
                Z-rapport avancé
              </Button>
            </div>

            <p className="mt-2 text-xs text-muted">
              {mode === "multi"
                ? "Z-rapport avancé : 5 feuilles Excel (synthèse, produits, ventes synthèse, ventes détaillées, analyse + graphiques)."
                : "Z-rapport avancé : Excel avec articles par vente, stats et graphiques."}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function ZReportLauncher({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("gap-2.5 px-5 py-2.5 text-sm font-semibold", className)}
      >
        <BarChart3 className="h-5 w-5" />
        Z-rapport
      </Button>
      <ZReportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

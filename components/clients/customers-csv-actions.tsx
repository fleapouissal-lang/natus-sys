"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  bulkImportLoyaltyCustomers,
  bulkImportProClients,
} from "@/lib/actions";
import {
  downloadLoyaltyCustomersTemplate,
  downloadProClientsTemplate,
  exportLoyaltyCustomersCsv,
  exportProClientsCsv,
  LOYALTY_CSV_COLUMNS,
  PRO_CSV_COLUMNS,
  parseLoyaltyImportRows,
  parseProImportRows,
  type CustomerCsvColumnDef,
  type CustomerCsvColumnRequirement,
  type LoyaltyImportRow,
  type ProImportRow,
} from "@/lib/loyalty/customer-csv";
import type { LoyaltyCustomer, Store } from "@/lib/types";
import { cn } from "@/lib/utils";

type CustomersCsvKind = "loyalty" | "pro";

function requirementBadgeClass(requirement: CustomerCsvColumnRequirement): string {
  switch (requirement) {
    case "obligatoire":
      return "bg-danger/10 text-danger";
    case "optionnel":
      return "bg-primary/10 text-primary-dark";
    case "export":
      return "bg-muted/20 text-muted";
    case "auto":
      return "bg-warning/10 text-warning";
  }
}

function requirementLabel(requirement: CustomerCsvColumnRequirement): string {
  switch (requirement) {
    case "obligatoire":
      return "Obligatoire";
    case "optionnel":
      return "Optionnel";
    case "export":
      return "Export";
    case "auto":
      return "Auto";
  }
}

function CustomerCsvColumnGuide({ columns }: { columns: CustomerCsvColumnDef[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="max-h-56 overflow-y-auto">
        <table className="w-full min-w-[32rem] text-left text-xs">
          <thead className="sticky top-0 z-10 bg-champagne/90 backdrop-blur-sm">
            <tr className="border-b border-primary/15">
              <th className="px-3 py-2 font-semibold text-foreground">Colonne</th>
              <th className="px-3 py-2 font-semibold text-foreground">Statut</th>
              <th className="px-3 py-2 font-semibold text-foreground">Description</th>
              <th className="px-3 py-2 font-semibold text-foreground">Exemple</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr key={col.header} className="border-b border-border/60 last:border-b-0">
                <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">
                  {col.header}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      requirementBadgeClass(col.requirement)
                    )}
                  >
                    {requirementLabel(col.requirement)}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted">{col.description}</td>
                <td className="px-3 py-2 text-foreground/80 whitespace-nowrap">
                  {col.example || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CustomersCsvActions({
  kind,
  exportRows,
  stores,
  onImported,
  disabled,
}: {
  kind: CustomersCsvKind;
  exportRows: LoyaltyCustomer[];
  stores?: Pick<Store, "id" | "name">[];
  onImported: () => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [loyaltyRows, setLoyaltyRows] = useState<LoyaltyImportRow[]>([]);
  const [proRows, setProRows] = useState<ProImportRow[]>([]);
  const [importResult, setImportResult] = useState<{
    created: number;
    errors: string[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const isPro = kind === "pro";
  const rowCount = isPro ? proRows.length : loyaltyRows.length;
  const columns = isPro ? PRO_CSV_COLUMNS : LOYALTY_CSV_COLUMNS;
  const storeNames = stores?.map((store) => store.name) ?? [];

  function handleExport() {
    if (exportRows.length === 0) {
      window.alert("Aucun client à exporter pour la sélection actuelle.");
      return;
    }
    if (isPro) {
      exportProClientsCsv(exportRows);
    } else {
      exportLoyaltyCustomersCsv(exportRows);
    }
  }

  function resetImportState() {
    setFileName("");
    setParseErrors([]);
    setLoyaltyRows([]);
    setProRows([]);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openImport() {
    resetImportState();
    setImportOpen(true);
  }

  function closeImport() {
    setImportOpen(false);
    resetImportState();
  }

  function handleFileChange(file: File | null) {
    resetImportState();
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (isPro) {
        const { rows, errors } = parseProImportRows(text);
        setProRows(rows);
        setParseErrors(errors);
      } else {
        const { rows, errors } = parseLoyaltyImportRows(text);
        setLoyaltyRows(rows);
        setParseErrors(errors);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleImport() {
    startTransition(async () => {
      if (isPro) {
        if (proRows.length === 0) return;
        const result = await bulkImportProClients(proRows);
        setImportResult(result);
        if (result.created > 0) onImported();
        return;
      }

      if (loyaltyRows.length === 0) return;
      const result = await bulkImportLoyaltyCustomers(loyaltyRows);
      setImportResult(result);
      if (result.created > 0) onImported();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          disabled={disabled}
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          Exporter
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          disabled={disabled || (isPro && (!stores || stores.length === 0))}
          onClick={openImport}
        >
          <Upload className="h-4 w-4" />
          Importer
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
      />

      {importOpen && (
        <Modal onClose={closeImport} size="lg">
          <h3 className="text-lg font-semibold">
            {isPro ? "Importer des clients Pro" : "Importer des clients fidélité"}
          </h3>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted">
              {isPro
                ? "Téléchargez le modèle CSV structuré, complétez les colonnes puis importez le fichier. Chaque ligne crée un compte Client Pro."
                : "Téléchargez le modèle CSV structuré, complétez les colonnes puis importez le fichier. Chaque ligne crée une carte fidélité."}
            </p>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Référence des colonnes
              </p>
              <CustomerCsvColumnGuide columns={columns} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() =>
                  isPro
                    ? downloadProClientsTemplate(storeNames)
                    : downloadLoyaltyCustomersTemplate()
                }
              >
                <FileUp className="h-4 w-4" />
                Télécharger le modèle CSV
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                Choisir un fichier CSV
              </Button>
            </div>

            <p className="text-xs text-muted">
              Le modèle inclut une ligne d&apos;en-tête, une ligne « guide colonnes »
              (ignorée à l&apos;import) et des exemples. L&apos;export génère le même
              format avec toutes les colonnes.
            </p>

            {fileName ? (
              <p className="text-sm text-foreground">
                Fichier : <span className="font-medium">{fileName}</span>
                {rowCount > 0
                  ? ` · ${rowCount} ligne${rowCount > 1 ? "s" : ""} valide${rowCount > 1 ? "s" : ""}`
                  : ""}
              </p>
            ) : null}

            {parseErrors.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                <p className="font-medium">Avertissements de lecture</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {parseErrors.slice(0, 8).map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                  {parseErrors.length > 8 && (
                    <li>… et {parseErrors.length - 8} autre(s) message(s)</li>
                  )}
                </ul>
              </div>
            )}

            {importResult && (
              <div
                className={
                  importResult.created > 0
                    ? "rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm"
                    : "rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
                }
              >
                <p className="font-medium text-foreground">
                  {importResult.created > 0
                    ? `${importResult.created} client${importResult.created > 1 ? "s" : ""} importé${importResult.created > 1 ? "s" : ""}`
                    : "Aucun client importé"}
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                    {importResult.errors.slice(0, 10).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>… et {importResult.errors.length - 10} erreur(s)</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeImport}>
                Fermer
              </Button>
              <Button
                type="button"
                loading={pending}
                disabled={rowCount === 0 || pending}
                onClick={handleImport}
              >
                Importer {rowCount > 0 ? `(${rowCount})` : ""}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

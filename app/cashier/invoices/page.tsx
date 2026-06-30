import { Suspense } from "react";
import { InvoicesHistory } from "@/components/invoices/invoices-history";
import { Card } from "@/components/ui/card";
import { loadInvoicesListPage } from "@/lib/sales/invoice-page-data";
import { getStorePosInvoiceHistoryDateBounds } from "@/lib/sales/invoice-history-window";

export const dynamic = "force-dynamic";

export default async function CashierInvoicesPage() {
  const { sales, error, basePath, scopeLabel, isStorePosAccount, invoiceHistoryDays } =
    await loadInvoicesListPage("cashier");

  const historyBounds = isStorePosAccount ? getStorePosInvoiceHistoryDateBounds() : undefined;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Factures</h1>
        <p className="mt-1 text-muted">
          {isStorePosAccount
            ? `Factures validées par le directeur — ${invoiceHistoryDays} derniers jours`
            : "Factures validées par le directeur — visibles après validation uniquement"}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          Impossible de charger les factures : {error}
        </p>
      )}

      {!error && sales.length === 0 ? (
        <Card className="py-12 text-center text-muted">
          {isStorePosAccount
            ? `Aucune facture sur les ${invoiceHistoryDays} derniers jours pour ${scopeLabel}`
            : `Aucune facture enregistrée pour ${scopeLabel}`}
        </Card>
      ) : (
        <Suspense fallback={null}>
          <InvoicesHistory
            sales={sales}
            detailBasePath={basePath}
            scopeLabel={scopeLabel}
            defaultDatePreset={isStorePosAccount ? "month" : "all"}
            historyMinDate={historyBounds?.minDate}
          />
        </Suspense>
      )}
    </div>
  );
}

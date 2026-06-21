import { Suspense } from "react";
import { InvoicesHistory } from "@/components/invoices/invoices-history";
import { Card } from "@/components/ui/card";
import { loadInvoicesListPage } from "@/lib/sales/invoice-page-data";

export const dynamic = "force-dynamic";

export default async function CashierInvoicesPage() {
  const { sales, error, basePath, scopeLabel } = await loadInvoicesListPage("cashier");

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Factures</h1>
        <p className="mt-1 text-muted">
          Toutes les factures du magasin — caisse et commandes
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          Impossible de charger les factures : {error}
        </p>
      )}

      {!error && sales.length === 0 ? (
        <Card className="py-12 text-center text-muted">
          Aucune facture enregistrée pour {scopeLabel}
        </Card>
      ) : (
        <Suspense fallback={null}>
          <InvoicesHistory
            sales={sales}
            detailBasePath={basePath}
            scopeLabel={scopeLabel}
            defaultDatePreset="all"
          />
        </Suspense>
      )}
    </div>
  );
}

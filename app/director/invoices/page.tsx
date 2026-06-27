import { Suspense } from "react";
import { InvoicesHistory } from "@/components/invoices/invoices-history";
import { Card } from "@/components/ui/card";
import { loadInvoicesListPage } from "@/lib/sales/invoice-page-data";

export const dynamic = "force-dynamic";

export default async function DirectorInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const params = await searchParams;
  const {
    sales,
    error,
    basePath,
    stores,
    selectedStoreId,
    scopeLabel,
    showStore,
    showCashier,
    canValidateInvoices,
  } = await loadInvoicesListPage("director", params);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Factures</h1>
        <p className="mt-1 text-muted">
          Toutes les ventes — validation obligatoire avant visibilité magasin et portail client
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          Impossible de charger les factures : {error}
        </p>
      )}

      {stores.length === 0 ? (
        <Card className="py-12 text-center text-muted">Aucun magasin actif</Card>
      ) : (
        <Suspense fallback={null}>
          <InvoicesHistory
            sales={sales}
            detailBasePath={basePath}
            scopeLabel={scopeLabel}
            stores={stores.length > 1 ? stores : undefined}
            selectedStoreId={selectedStoreId}
            showStore={showStore}
            showCashier={showCashier}
            canValidateInvoices={canValidateInvoices}
            defaultDatePreset="all"
          />
        </Suspense>
      )}
    </div>
  );
}

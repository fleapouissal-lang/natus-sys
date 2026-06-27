import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";
import { loadInvoiceDetailPage } from "@/lib/sales/invoice-page-data";

export const dynamic = "force-dynamic";

export default async function DirectorInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ store?: string }>;
}) {
  const { id } = await params;
  const { store } = await searchParams;
  const { sale, listPath, scopeLabel, canValidateInvoices } = await loadInvoiceDetailPage(
    "director",
    id,
    { store }
  );

  return (
    <div className="animate-fade-in">
      <InvoiceDetailClient
        sale={sale}
        listPath={listPath}
        scopeLabel={scopeLabel}
        canValidateInvoices={canValidateInvoices}
      />
    </div>
  );
}

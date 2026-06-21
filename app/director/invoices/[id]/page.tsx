import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";
import { loadInvoiceDetailPage } from "@/lib/sales/invoice-page-data";

export const dynamic = "force-dynamic";

export default async function DirectorInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { sale, listPath, scopeLabel } = await loadInvoiceDetailPage("director", id);

  return (
    <div className="animate-fade-in">
      <InvoiceDetailClient sale={sale} listPath={listPath} scopeLabel={scopeLabel} />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer, ShieldCheck } from "lucide-react";
import { PosInvoice } from "@/components/pos/pos-invoice";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { printSaleDocument } from "@/components/pos/print-sale-document";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { invoiceTypeLabel } from "@/lib/sales/fetch-invoices";
import { isSaleInvoiceValidated } from "@/lib/sales/invoice-validation";
import { saleToDocumentData, type InvoiceSale } from "@/lib/sales/sale-to-document";
import { INVOICE_CLIENT_DIVERS } from "@/lib/constants/invoice";
import { downloadInvoiceHtml } from "@/lib/sales/download-invoice";
import {
  draftFromSale,
  InvoiceCustomerEditForm,
  type InvoiceCustomerDraft,
} from "@/components/invoices/invoice-customer-edit-form";
import { validateSaleInvoice } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export function InvoiceDetailClient({
  sale,
  listPath,
  scopeLabel,
  canValidateInvoices = false,
}: {
  sale: InvoiceSale;
  listPath: string;
  scopeLabel: string;
  canValidateInvoices?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [customerDraft, setCustomerDraft] = useState<InvoiceCustomerDraft>(() =>
    draftFromSale(sale)
  );
  const validated = isSaleInvoiceValidated(sale);
  const invoiceNo = saleDocumentNumber(sale.id);

  useEffect(() => {
    setCustomerDraft(draftFromSale(sale));
  }, [
    sale.id,
    sale.customer_name,
    sale.customer_phone,
    sale.customer_email,
    sale.customer_ice,
    sale.customers,
  ]);

  const documentData = useMemo(() => {
    const base = saleToDocumentData(sale);
    return {
      ...base,
      customerName: customerDraft.customerName.trim() || INVOICE_CLIENT_DIVERS,
      customerPhone: customerDraft.customerPhone.trim() || undefined,
      customerEmail: customerDraft.customerEmail.trim() || undefined,
      customerIce: customerDraft.customerIce.trim() || undefined,
    };
  }, [sale, customerDraft]);

  function handleValidate() {
    setError("");
    startTransition(async () => {
      const result = await validateSaleInvoice(sale.id);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={listPath}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux factures
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Facture {invoiceNo}
          </h1>
          <p className="mt-1 text-muted">
            {formatDate(sale.created_at)} — {scopeLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={sale.shopify_order_id ? "accent" : "default"}>
              {invoiceTypeLabel(sale)}
            </Badge>
            <Badge variant={validated ? "success" : "warning"}>
              {validated ? "Validée" : "En attente directeur"}
            </Badge>
            {sale.cancelled_at && (
              <Badge variant="danger">Annulée</Badge>
            )}
            <span className="text-sm font-semibold">
              {formatCurrency(Number(sale.total))}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          {canValidateInvoices && !validated && (
            <Button type="button" loading={isPending} onClick={handleValidate}>
              <ShieldCheck className="h-4 w-4" />
              Valider la facture
            </Button>
          )}
          {validated && (
            <>
              <Button
                type="button"
                onClick={() => printSaleDocument("invoice", documentData)}
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadInvoiceHtml(documentData)}
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {!validated && canValidateInvoices && !sale.cancelled_at && (
        <>
          <InvoiceCustomerEditForm
            sale={sale}
            draft={customerDraft}
            onDraftChange={setCustomerDraft}
          />
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
            Cette facture n&apos;est pas encore visible pour le caissier ni le gérant du magasin.
            Validez-la pour la rendre accessible et imprimable en magasin.
          </p>
        </>
      )}

      <Card className="overflow-hidden p-0 print:border-0 print:shadow-none">
        <div className="flex justify-center bg-[#ebe6dc] p-4 print:bg-white print:p-0">
          <PosInvoice data={documentData} />
        </div>
      </Card>
    </div>
  );
}

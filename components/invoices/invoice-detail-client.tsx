"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { PosInvoice } from "@/components/pos/pos-invoice";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { printSaleDocument } from "@/components/pos/print-sale-document";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { invoiceTypeLabel } from "@/lib/sales/fetch-invoices";
import { saleToDocumentData, type InvoiceSale } from "@/lib/sales/sale-to-document";
import { downloadInvoiceHtml } from "@/lib/sales/download-invoice";
import { formatCurrency, formatDate } from "@/lib/utils";

export function InvoiceDetailClient({
  sale,
  listPath,
  scopeLabel,
}: {
  sale: InvoiceSale;
  listPath: string;
  scopeLabel: string;
}) {
  const documentData = saleToDocumentData(sale);
  const invoiceNo = saleDocumentNumber(sale.id);

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
            {sale.cancelled_at && (
              <Badge variant="danger">Annulée</Badge>
            )}
            <span className="text-sm font-semibold">
              {formatCurrency(Number(sale.total))}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button type="button" onClick={() => printSaleDocument("invoice")}>
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
        </div>
      </div>

      <Card className="overflow-hidden p-0 print:border-0 print:shadow-none">
        <div className="flex justify-center bg-[#ebe6dc] p-4 print:bg-white print:p-0">
          <PosInvoice data={documentData} />
        </div>
      </Card>
    </div>
  );
}

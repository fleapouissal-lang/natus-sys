"use client";

import Link from "next/link";
import { ExternalLink, FileText, Receipt } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { PosInvoice } from "@/components/pos/pos-invoice";
import { printSaleDocument } from "@/components/pos/print-sale-document";
import { invoiceDetailPath } from "@/lib/sales/invoice-routes";
import { Ticket } from "@/components/pos/ticket";

export function SaleDocumentsModal({
  data,
  onClose,
  closeLabel,
  invoicesPath = "/cashier/invoices",
  showInvoiceActions = false,
}: {
  data: SaleDocumentData;
  onClose: () => void;
  closeLabel: string;
  invoicesPath?: string;
  /** Facture visible seulement après validation directeur */
  showInvoiceActions?: boolean;
}) {
  const invoiceHref = invoiceDetailPath(invoicesPath, data.saleId);

  return (
    <Modal onClose={onClose} size="md" scrollable={false}>
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold">Vente enregistrée</h3>
        <p className="mt-1 text-sm text-muted">
          {showInvoiceActions
            ? "Ticket caisse — facture disponible à l'impression."
            : "Ticket caisse enregistré. La facture sera disponible après validation du directeur."}
        </p>
      </div>

      <div className="flex justify-center rounded-lg border border-border bg-[#ebe6dc] p-4">
        <Ticket data={data} />
      </div>

      {showInvoiceActions && (
        <div className="natus-invoice-print-only" aria-hidden>
          <PosInvoice data={data} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
        <Button type="button" onClick={() => printSaleDocument("ticket")}>
          <Receipt className="h-4 w-4" />
          Imprimer ticket
        </Button>
        {showInvoiceActions ? (
          <>
            <Button type="button" variant="secondary" onClick={() => printSaleDocument("invoice")}>
              <FileText className="h-4 w-4" />
              Imprimer facture
            </Button>
            <Link
              href={invoiceHref}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-natus)] px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-black/5 hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir la facture
            </Link>
          </>
        ) : (
          <p className="w-full text-center text-xs text-muted">
            Facture créée automatiquement — en attente de validation directeur.
          </p>
        )}
        <Button type="button" variant="ghost" onClick={onClose}>
          {closeLabel}
        </Button>
      </div>
    </Modal>
  );
}

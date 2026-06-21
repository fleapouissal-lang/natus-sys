"use client";

import { FileText, Receipt } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { PosInvoice } from "@/components/pos/pos-invoice";
import { printSaleDocument } from "@/components/pos/print-sale-document";
import { Ticket } from "@/components/pos/ticket";

export function SaleDocumentsModal({
  data,
  onClose,
  closeLabel,
}: {
  data: SaleDocumentData;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <Modal onClose={onClose} size="md" scrollable={false}>
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold">Vente enregistrée</h3>
        <p className="mt-1 text-sm text-muted">Ticket caisse — facture disponible à l&apos;impression.</p>
      </div>

      <div className="flex justify-center rounded-lg border border-border bg-[#ebe6dc] p-4">
        <Ticket data={data} />
      </div>

      {/* Facture hors écran — utilisée uniquement pour l'impression PDF */}
      <div className="natus-invoice-print-only" aria-hidden>
        <PosInvoice data={data} />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
        <Button type="button" onClick={() => printSaleDocument("ticket")}>
          <Receipt className="h-4 w-4" />
          Imprimer ticket
        </Button>
        <Button type="button" variant="secondary" onClick={() => printSaleDocument("invoice")}>
          <FileText className="h-4 w-4" />
          Imprimer facture
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          {closeLabel}
        </Button>
      </div>
    </Modal>
  );
}

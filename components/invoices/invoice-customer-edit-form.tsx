"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { INVOICE_CLIENT_DIVERS } from "@/lib/constants/invoice";
import {
  saleInvoiceCustomerEmail,
  saleInvoiceCustomerIce,
  saleInvoiceCustomerName,
  saleInvoiceCustomerPhone,
} from "@/lib/sales/invoice-customer";
import type { InvoiceSale } from "@/lib/sales/sale-to-document";
import { updateSaleInvoiceCustomer } from "@/lib/actions";

export type InvoiceCustomerDraft = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerIce: string;
};

function draftFromSale(sale: InvoiceSale): InvoiceCustomerDraft {
  return {
    customerName: saleInvoiceCustomerName(sale),
    customerPhone: saleInvoiceCustomerPhone(sale) || "",
    customerEmail: saleInvoiceCustomerEmail(sale) || "",
    customerIce: saleInvoiceCustomerIce(sale) || "",
  };
}

function isDraftDirty(sale: InvoiceSale, draft: InvoiceCustomerDraft): boolean {
  const initial = draftFromSale(sale);
  return (
    draft.customerName.trim() !== initial.customerName.trim() ||
    draft.customerPhone.trim() !== initial.customerPhone.trim() ||
    draft.customerEmail.trim() !== initial.customerEmail.trim() ||
    draft.customerIce.trim() !== initial.customerIce.trim()
  );
}

export function InvoiceCustomerEditForm({
  sale,
  draft,
  onDraftChange,
  variant = "card",
  onClose,
  onSaved,
}: {
  sale: InvoiceSale;
  draft: InvoiceCustomerDraft;
  onDraftChange: (draft: InvoiceCustomerDraft) => void;
  variant?: "card" | "modal";
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const initial = draftFromSale(sale);
  const dirty = isDraftDirty(sale, draft);

  function patchDraft(partial: Partial<InvoiceCustomerDraft>) {
    onDraftChange({ ...draft, ...partial });
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    startTransition(async () => {
      const result = await updateSaleInvoiceCustomer(sale.id, {
        customerName: draft.customerName.trim() || INVOICE_CLIENT_DIVERS,
        customerPhone: draft.customerPhone.trim() || null,
        customerEmail: draft.customerEmail.trim() || null,
        customerIce: draft.customerIce.trim() || null,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      setSaved(true);
      onSaved?.();
      router.refresh();
    });
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserPen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Client sur la facture</h2>
              <p className="mt-0.5 text-sm text-muted">
                Modifiez les informations affichées sur la facture avant validation.
              </p>
            </div>
            {variant === "modal" && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 text-muted hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nom client"
          name="customerName"
          value={draft.customerName}
          onChange={(e) => patchDraft({ customerName: e.target.value })}
          placeholder={INVOICE_CLIENT_DIVERS}
          required
        />
        <Input
          label="Téléphone"
          name="customerPhone"
          type="tel"
          value={draft.customerPhone}
          onChange={(e) => patchDraft({ customerPhone: e.target.value })}
          placeholder="Optionnel"
        />
        <Input
          label="Email"
          name="customerEmail"
          type="email"
          value={draft.customerEmail}
          onChange={(e) => patchDraft({ customerEmail: e.target.value })}
          placeholder="Optionnel"
        />
        <Input
          label="ICE"
          name="customerIce"
          value={draft.customerIce}
          onChange={(e) => patchDraft({ customerIce: e.target.value })}
          placeholder="Identifiant Commun de l'Entreprise"
        />
      </div>

      {sale.customers?.card_number && (
        <p className="text-sm text-muted">
          Carte fidélité : {sale.customers.card_number}
          {sale.customers.full_name ? ` — ${sale.customers.full_name}` : ""}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {saved && !error && (
        <p className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          Informations client enregistrées.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={isPending} disabled={!dirty && !isPending}>
          Enregistrer
        </Button>
        {dirty && (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              onDraftChange(initial);
              setError("");
              setSaved(false);
            }}
          >
            Annuler
          </Button>
        )}
        {variant === "modal" && onClose && (
          <Button type="button" variant="ghost" disabled={isPending} onClick={onClose}>
            Fermer
          </Button>
        )}
      </div>
    </form>
  );

  if (variant === "modal") {
    return form;
  }

  return <Card className="print:hidden">{form}</Card>;
}

export function InvoiceCustomerEditModal({
  sale,
  onClose,
  onSaved,
}: {
  sale: InvoiceSale;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState(() => draftFromSale(sale));

  useEffect(() => {
    setDraft(draftFromSale(sale));
  }, [sale]);

  return (
    <Modal onClose={onClose} size="lg">
      <InvoiceCustomerEditForm
        sale={sale}
        draft={draft}
        onDraftChange={setDraft}
        variant="modal"
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

export { draftFromSale };
